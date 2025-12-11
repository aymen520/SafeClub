// SafeClub Web Interface
// Web3.js integration for interacting with the SafeClub smart contract

// Contract ABI - Update this after deploying your contract
const CONTRACT_ABI = [
    // Add your contract ABI here after deployment
    // You can get it from Remix after compilation
];

// State Management
let web3;
let contract;
let userAccount;
let contractAddress = ''; // Will be set by user input or config

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('depositBtn').addEventListener('click', depositFunds);
    document.getElementById('createProposalBtn').addEventListener('click', createProposal);
    document.getElementById('refreshProposals').addEventListener('click', refreshProposals);
}

// Initialize App
async function initializeApp() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        web3 = new Web3(window.ethereum);
        
        // Check if already connected
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateUI();
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateUI();
            } else {
                disconnect();
            }
        });
        
        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    } else {
        showToast('Please install MetaMask!', 'error');
        document.getElementById('connectionStatus').textContent = 'MetaMask non installé';
    }
}

// Connect Wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            showToast('MetaMask n\'est pas installé!', 'error');
            return;
        }
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        // Prompt for contract address if not set
        if (!contractAddress) {
            contractAddress = prompt('Entrez l\'adresse du contrat SafeClub:');
            if (!contractAddress) {
                showToast('Adresse du contrat requise', 'error');
                return;
            }
        }
        
        // Initialize contract
        // Note: You need to add the actual ABI
        try {
            contract = new web3.eth.Contract(CONTRACT_ABI, contractAddress);
            await updateUI();
            showToast('Connecté avec succès!', 'success');
        } catch (error) {
            showToast('Erreur lors de l\'initialisation du contrat. Vérifiez l\'ABI.', 'error');
            console.error(error);
        }
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast('Erreur de connexion', 'error');
    }
}

// Disconnect
function disconnect() {
    userAccount = null;
    contract = null;
    document.getElementById('connectionStatus').textContent = 'Déconnecté';
    document.getElementById('connectionStatus').className = 'value status-disconnected';
    document.getElementById('userAddress').textContent = '-';
    document.getElementById('walletText').textContent = 'Connecter MetaMask';
}

// Update UI
async function updateUI() {
    if (!userAccount) return;
    
    // Update connection status
    document.getElementById('connectionStatus').textContent = 'Connecté';
    document.getElementById('connectionStatus').className = 'value status-connected';
    
    // Update user address (shortened)
    const shortAddress = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
    document.getElementById('userAddress').textContent = shortAddress;
    document.getElementById('walletText').textContent = shortAddress;
    
    if (!contract) return;
    
    try {
        // Get vault balance
        const balance = await web3.eth.getBalance(contractAddress);
        const balanceInEth = web3.utils.fromWei(balance, 'ether');
        document.getElementById('vaultBalance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;
        
        // Get member count
        const memberCount = await contract.methods.memberCount().call();
        document.getElementById('memberCount').textContent = memberCount;
        
        // Load proposals
        await loadProposals();
        
        // Load members
        await loadMembers();
        
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Deposit Funds
async function depositFunds() {
    const amount = document.getElementById('depositAmount').value;
    
    if (!amount || amount <= 0) {
        showToast('Montant invalide', 'error');
        return;
    }
    
    if (!contract || !userAccount) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const amountInWei = web3.utils.toWei(amount, 'ether');
        
        await web3.eth.sendTransaction({
            from: userAccount,
            to: contractAddress,
            value: amountInWei
        });
        
        showToast(`${amount} ETH déposés avec succès!`, 'success');
        document.getElementById('depositAmount').value = '';
        await updateUI();
        
    } catch (error) {
        console.error('Error depositing funds:', error);
        showToast('Erreur lors du dépôt', 'error');
    } finally {
        showLoading(false);
    }
}

// Create Proposal
async function createProposal() {
    const description = document.getElementById('proposalDescription').value;
    const recipient = document.getElementById('proposalRecipient').value;
    const amount = document.getElementById('proposalAmount').value;
    const duration = document.getElementById('proposalDuration').value;
    
    if (!description || !recipient || !amount || !duration) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(recipient)) {
        showToast('Adresse du destinataire invalide', 'error');
        return;
    }
    
    if (!contract || !userAccount) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const amountInWei = web3.utils.toWei(amount, 'ether');
        
        await contract.methods.createProposal(
            description,
            recipient,
            amountInWei,
            parseInt(duration)
        ).send({ from: userAccount });
        
        showToast('Proposition créée avec succès!', 'success');
        
        // Clear form
        document.getElementById('proposalDescription').value = '';
        document.getElementById('proposalRecipient').value = '';
        document.getElementById('proposalAmount').value = '';
        document.getElementById('proposalDuration').value = '7';
        
        await updateUI();
        
    } catch (error) {
        console.error('Error creating proposal:', error);
        showToast('Erreur lors de la création de la proposition', 'error');
    } finally {
        showLoading(false);
    }
}

// Load Proposals
async function loadProposals() {
    if (!contract) return;
    
    try {
        const proposalCount = await contract.methods.proposalCount().call();
        const proposalsContainer = document.getElementById('proposalsList');
        
        if (proposalCount == 0) {
            proposalsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Aucune proposition pour le moment.</p>
                    <p class="hint">Créez la première proposition!</p>
                </div>
            `;
            return;
        }
        
        proposalsContainer.innerHTML = '';
        
        for (let i = 1; i <= proposalCount; i++) {
            const proposal = await contract.methods.getProposal(i).call();
            const proposalCard = createProposalCard(i, proposal);
            proposalsContainer.appendChild(proposalCard);
        }
        
    } catch (error) {
        console.error('Error loading proposals:', error);
    }
}

// Create Proposal Card
function createProposalCard(id, proposal) {
    const card = document.createElement('div');
    card.className = 'proposal-card glass-card';
    
    const amount = web3.utils.fromWei(proposal.amount, 'ether');
    const deadline = new Date(proposal.deadline * 1000);
    const now = new Date();
    const isExpired = now > deadline;
    const isExecuted = proposal.executed;
    
    // Calculate acceptance
    const totalVotes = parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst);
    const votePercentage = totalVotes > 0 ? (parseInt(proposal.votesFor) / totalVotes * 100).toFixed(1) : 0;
    
    let statusBadge = '';
    if (isExecuted) {
        statusBadge = '<span class="status-badge executed">✅ Exécutée</span>';
    } else if (isExpired) {
        statusBadge = '<span class="status-badge expired">⏰ Expirée</span>';
    } else {
        statusBadge = '<span class="status-badge active">🗳️ En cours</span>';
    }
    
    card.innerHTML = `
        <div class="proposal-header">
            <h3>Proposition #${id}</h3>
            ${statusBadge}
        </div>
        <p class="proposal-description">${proposal.description}</p>
        <div class="proposal-details">
            <div class="detail-row">
                <span class="detail-label">Montant:</span>
                <span class="detail-value highlight">${amount} ETH</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Destinataire:</span>
                <span class="detail-value address">${formatAddress(proposal.recipient)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Deadline:</span>
                <span class="detail-value">${deadline.toLocaleString('fr-FR')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Votes POUR:</span>
                <span class="detail-value vote-for">${proposal.votesFor}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Votes CONTRE:</span>
                <span class="detail-value vote-against">${proposal.votesAgainst}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${votePercentage}%"></div>
                <span class="progress-text">${votePercentage}% POUR</span>
            </div>
        </div>
        <div class="proposal-actions">
            ${!isExecuted && !isExpired ? `
                <button class="btn-vote vote-for" onclick="vote(${id}, true)">👍 Pour</button>
                <button class="btn-vote vote-against" onclick="vote(${id}, false)">👎 Contre</button>
            ` : ''}
            ${!isExecuted && isExpired ? `
                <button class="btn-primary" onclick="executeProposal(${id})">⚡ Exécuter</button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Vote on Proposal
async function vote(proposalId, support) {
    if (!contract || !userAccount) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showLoading(true);
        await contract.methods.vote(proposalId, support).send({ from: userAccount });
        showToast(`Vote enregistré!`, 'success');
        await updateUI();
    } catch (error) {
        console.error('Error voting:', error);
        showToast('Erreur lors du vote', 'error');
    } finally {
       showLoading(false);
    }
}

// Execute Proposal
async function executeProposal(proposalId) {
    if (!contract || !userAccount) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showLoading(true);
        await contract.methods.executeProposal(proposalId).send({ from: userAccount });
        showToast('Proposition exécutée avec succès!', 'success');
        await updateUI();
    } catch (error) {
        console.error('Error executing proposal:', error);
        showToast('Erreur lors de l\'exécution', 'error');
    } finally {
        showLoading(false);
    }
}

// Load Members
async function loadMembers() {
    if (!contract) return;
    
    try {
        const members = await contract.methods.getMembers().call();
        const membersContainer = document.getElementById('membersList');
        
        if (members.length === 0) {
            membersContainer.innerHTML = '<div class="empty-state">Aucun membre</div>';
            return;
        }
        
        membersContainer.innerHTML = members.map(address => `
            <div class="member-item ${address.toLowerCase() === userAccount.toLowerCase() ? 'current-user' : ''}">
                <span class="member-icon">${address.toLowerCase() === userAccount.toLowerCase() ? '👤' : '👥'}</span>
                <span class="member-address">${formatAddress(address)}</span>
                ${address.toLowerCase() === userAccount.toLowerCase() ? '<span class="badge">Vous</span>' : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Refresh Proposals
async function refreshProposals() {
    showToast('Actualisation...', 'info');
    await updateUI();
}

// Utility Functions
function formatAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Make vote and executeProposal functions global
window.vote = vote;
window.executeProposal = executeProposal;
