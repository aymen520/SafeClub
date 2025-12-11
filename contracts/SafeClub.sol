// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafeClub
 * @dev Smart contract pour la gestion sécurisée de la trésorerie d'un club étudiant
 * @notice Permet la création de propositions de dépenses et le vote des membres
 */
contract SafeClub is ReentrancyGuard, Ownable {
    
    // ============ Structures ============
    
    /**
     * @dev Structure représentant une proposition de dépense
     */
    struct Proposal {
        uint256 id;
        string description;
        address payable recipient;
        uint256 amount;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        address creator;
        uint256 createdAt;
    }
    
    // ============ Variables d'État ============
    
    /// @dev Mapping pour vérifier si une adresse est un membre actif
    mapping(address => bool) public members;
    
    /// @dev Tableau de toutes les adresses membres pour l'énumération
    address[] public memberList;
    
    /// @dev Nombre total de membres actifs
    uint256 public memberCount;
    
    /// @dev Mapping des propositions par ID
    mapping(uint256 => Proposal) public proposals;
    
    /// @dev Mapping pour suivre qui a voté sur quelle proposition
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @dev Mapping pour suivre le vote de chaque membre sur chaque proposition
    mapping(uint256 => mapping(address => bool)) public votes;
    
    /// @dev Compteur pour les IDs de propositions
    uint256 public proposalCount;
    
    // ============ Events ============
    
    event MemberAdded(address indexed member, uint256 timestamp);
    event MemberRemoved(address indexed member, uint256 timestamp);
    event FundsReceived(address indexed from, uint256 amount, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string description,
        uint256 amount,
        address recipient,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 timestamp
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Custom Errors ============
    
    error NotAMember();
    error AlreadyAMember();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientFunds();
    error ProposalDoesNotExist();
    error ProposalAlreadyExecuted();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error AlreadyVoted();
    error ProposalNotAccepted();
    error TransferFailed();
    error InvalidDeadline();
    
    // ============ Modifiers ============
    
    /// @dev Vérifie que l'appelant est un membre actif
    modifier onlyMember() {
        if (!members[msg.sender]) revert NotAMember();
        _;
    }
    
    /// @dev Vérifie qu'une proposition existe
    modifier proposalExists(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalCount) revert ProposalDoesNotExist();
        _;
    }
    
    /// @dev Vérifie qu'une proposition n'a pas été exécutée
    modifier proposalNotExecuted(uint256 _proposalId) {
        if (proposals[_proposalId].executed) revert ProposalAlreadyExecuted();
        _;
    }
    
    /// @dev Vérifie que la deadline n'est pas dépassée
    modifier beforeDeadline(uint256 _proposalId) {
        if (block.timestamp > proposals[_proposalId].deadline) revert DeadlinePassed();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev Constructeur - le déployeur devient owner et premier membre
     */
    constructor() Ownable(msg.sender) {
        members[msg.sender] = true;
        memberList.push(msg.sender);
        memberCount = 1;
        emit MemberAdded(msg.sender, block.timestamp);
    }
    
    // ============ Fonctions de Gestion des Membres ============
    
    /**
     * @dev Ajoute un nouveau membre au club
     * @param _member Adresse du nouveau membre
     * @notice Seulement l'owner peut ajouter des membres
     */
    function addMember(address _member) external onlyOwner {
        if (_member == address(0)) revert InvalidAddress();
        if (members[_member]) revert AlreadyAMember();
        
        members[_member] = true;
        memberList.push(_member);
        memberCount++;
        
        emit MemberAdded(_member, block.timestamp);
    }
    
    /**
     * @dev Supprime un membre du club
     * @param _member Adresse du membre à supprimer
     * @notice Seulement l'owner peut supprimer des membres
     */
    function removeMember(address _member) external onlyOwner {
        if (!members[_member]) revert NotAMember();
        
        members[_member] = false;
        memberCount--;
        
        // Retirer du tableau memberList
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == _member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }
        
        emit MemberRemoved(_member, block.timestamp);
    }
    
    /**
     * @dev Vérifie si une adresse est un membre actif
     * @param _addr Adresse à vérifier
     * @return bool True si l'adresse est un membre actif
     */
    function isMember(address _addr) external view returns (bool) {
        return members[_addr];
    }
    
    /**
     * @dev Retourne la liste de tous les membres actifs
     * @return address[] Tableau des adresses membres
     */
    function getMembers() external view returns (address[] memory) {
        return memberList;
    }
    
    // ============ Fonctions de Gestion de la Trésorerie ============
    
    /**
     * @dev Fonction receive pour accepter des ETH
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Retourne le solde du vault (trésorerie)
     * @return uint256 Solde en Wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ============ Fonctions de Gestion des Propositions ============
    
    /**
     * @dev Crée une nouvelle proposition de dépense
     * @param _description Description de la proposition
     * @param _recipient Adresse qui recevra les fonds
     * @param _amount Montant en Wei à transférer
     * @param _durationInDays Durée en jours avant la deadline
     * @notice Seulement les membres peuvent créer des propositions
     */
    function createProposal(
        string memory _description,
        address payable _recipient,
        uint256 _amount,
        uint256 _durationInDays
    ) external onlyMember {
        if (_recipient == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();
        if (_amount > address(this).balance) revert InsufficientFunds();
        if (_durationInDays == 0) revert InvalidDeadline();
        
        proposalCount++;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);
        
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            description: _description,
            recipient: _recipient,
            amount: _amount,
            deadline: deadline,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        emit ProposalCreated(
            proposalCount,
            msg.sender,
            _description,
            _amount,
            _recipient,
            deadline
        );
    }
    
    /**
     * @dev Retourne les détails d'une proposition
     * @param _proposalId ID de la proposition
     * @return Proposal Structure complète de la proposition
     */
    function getProposal(uint256 _proposalId)
        external
        view
        proposalExists(_proposalId)
        returns (
            uint256 id,
            string memory description,
            address recipient,
            uint256 amount,
            uint256 deadline,
            uint256 votesFor,
            uint256 votesAgainst,
            bool executed,
            address creator,
            uint256 createdAt
        )
    {
        Proposal storage p = proposals[_proposalId];
        return (
            p.id,
            p.description,
            p.recipient,
            p.amount,
            p.deadline,
            p.votesFor,
            p.votesAgainst,
            p.executed,
            p.creator,
            p.createdAt
        );
    }
    
    // ============ Fonctions de Vote ============
    
    /**
     * @dev Permet à un membre de voter pour ou contre une proposition
     * @param _proposalId ID de la proposition
     * @param _support True pour voter POUR, False pour voter CONTRE
     * @notice Un membre ne peut voter qu'une seule fois par proposition
     * @notice Le vote n'est possible que avant la deadline
     */
    function vote(uint256 _proposalId, bool _support)
        external
        onlyMember
        proposalExists(_proposalId)
        proposalNotExecuted(_proposalId)
        beforeDeadline(_proposalId)
    {
        if (hasVoted[_proposalId][msg.sender]) revert AlreadyVoted();
        
        hasVoted[_proposalId][msg.sender] = true;
        votes[_proposalId][msg.sender] = _support;
        
        if (_support) {
            proposals[_proposalId].votesFor++;
        } else {
            proposals[_proposalId].votesAgainst++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support, block.timestamp);
    }
    
    /**
     * @dev Vérifie si un membre a déjà voté sur une proposition
     * @param _proposalId ID de la proposition
     * @param _voter Adresse du votant
     * @return bool True si le membre a déjà voté
     */
    function hasVotedOnProposal(uint256 _proposalId, address _voter)
        external
        view
        returns (bool)
    {
        return hasVoted[_proposalId][_voter];
    }
    
    /**
     * @dev Vérifie si une proposition est acceptée (Majorité absolue)
     * @param _proposalId ID de la proposition
     * @return bool True si la proposition est acceptée
     * @notice Règle: votesFor > 50% du nombre total de membres
     */
    function isProposalAccepted(uint256 _proposalId)
        public
        view
        proposalExists(_proposalId)
        returns (bool)
    {
        Proposal storage p = proposals[_proposalId];
        
        // Majorité absolue: votesFor > 50% de TOUS les membres
        // Exemple: 5 membres -> il faut au moins 3 votes POUR
        uint256 requiredVotes = (memberCount / 2) + 1;
        
        return p.votesFor >= requiredVotes;
    }
    
    // ============ Fonction d'Exécution ============
    
    /**
     * @dev Exécute une proposition acceptée et transfère les fonds
     * @param _proposalId ID de la proposition à exécuter
     * @notice La proposition doit être acceptée (majorité absolue)
     * @notice La deadline doit être passée
     * @notice Protection contre la reentrancy avec nonReentrant
     */
    function executeProposal(uint256 _proposalId)
        external
        onlyMember
        proposalExists(_proposalId)
        proposalNotExecuted(_proposalId)
        nonReentrant
    {
        Proposal storage p = proposals[_proposalId];
        
        // Vérifier que la deadline est passée
        if (block.timestamp <= p.deadline) revert DeadlineNotPassed();
        
        // Vérifier que la proposition est acceptée (majorité absolue)
        if (!isProposalAccepted(_proposalId)) revert ProposalNotAccepted();
        
        // Vérifier que les fonds sont disponibles
        if (p.amount > address(this).balance) revert InsufficientFunds();
        
        // ===== CHECKS-EFFECTS-INTERACTIONS Pattern =====
        
        // EFFECT: Marquer comme exécutée AVANT le transfert
        p.executed = true;
        
        // INTERACTION: Transférer les fonds
        (bool success, ) = p.recipient.call{value: p.amount}("");
        if (!success) revert TransferFailed();
        
        emit ProposalExecuted(_proposalId, p.recipient, p.amount, block.timestamp);
    }
}
