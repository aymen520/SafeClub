# SafeClub - Trésorerie Sécurisée d'un Club Étudiant

![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-blue)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Contracts-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Description

SafeClub est un smart contract Ethereum permettant à un club étudiant de gérer sa trésorerie de manière sécurisée et démocratique. Le système permet aux membres de:

- 💰 Gérer un coffre-fort en ETH
- 📝 Créer des propositions de dépenses
- 🗳️ Voter démocratiquement sur les propositions
- ✅ Exécuter les paiements uniquement si acceptés par la majorité absolue (> 50% de tous les membres)
- 🔒 Bénéficier de protections contre les vulnérabilités connues

## 🎯 Fonctionnalités Principales

### Gestion des Membres
- Ajout/suppression de membres (réservé à l'owner)
- Liste des membres actifs
- Vérification du statut de membre

### Gestion de la Trésorerie
- Réception d'ETH via la fonction `receive()`
- Consultation du solde en temps réel
- Sécurisation des fonds

### Système de Propositions
- Création de propositions avec:
  - Description
  - Montant demandé
  - Destinataire
  - Deadline (en jours)
- Suivi de toutes les propositions

### Système de Vote
- **Règle: Majorité absolue** (> 50% de tous les membres)
- Un seul vote par membre par proposition
- Vote possible uniquement avant la deadline
- Transparence totale des résultats

### Exécution Sécurisée
- Vérifications multiples avant transfert
- Protection contre la reentrancy
- Pattern Checks-Effects-Interactions
- Transfert uniquement si majorité absolue atteinte

## 🔒 Sécurité

Le contrat implémente plusieurs mécanismes de sécurité :

1. **Protection Reentrancy**: Utilisation de `ReentrancyGuard` d'OpenZeppelin
2. **Contrôle d'accès**: Modifiers `onlyOwner` et `onlyMember`
3. **Custom Errors**: Erreurs explicites pour économiser du gas
4. **Validations complètes**: Vérification de tous les paramètres
5. **Events**: Traçabilité de toutes les actions importantes

## 🛠️ Technologies Utilisées

- **Solidity**: ^0.8.0
- **OpenZeppelin Contracts**:
  - `ReentrancyGuard`: Protection contre les attaques de reentrancy
  - `Ownable`: Gestion des droits d'administration
- **Remix IDE**: Développement et tests
- **MetaMask**: Interaction avec le contrat

## 📦 Structure du Projet

```
SafeClub/
├── contracts/
│   └── SafeClub.sol          # Smart contract principal
├── docs/
│   ├── security-report.md    # Rapport de sécurité (5-8 pages)
│   ├── technical-documentation.md  # Documentation technique (3-5 pages)
│   └── test-scenarios.md     # Scénarios de test
├── web/                      # Interface web (optionnel)
│   ├── index.html
│   ├── app.js
│   └── style.css
└── README.md                 # Ce fichier
```

## 🚀 Déploiement avec Remix

### Prérequis

1. **Navigateur Web** avec MetaMask installé
2. **MetaMask** configuré avec un réseau de test (Sepolia, Goerli, etc.)
3. **ETH de test** dans votre wallet MetaMask
4. **Remix IDE**: https://remix.ethereum.org

### Instructions de Déploiement

#### Étape 1: Configurer l'environnement

1. Ouvrez [Remix IDE](https://remix.ethereum.org)
2. Créez un nouveau fichier `SafeClub.sol` dans le dossier `contracts/`
3. Copiez le code du contrat depuis `contracts/SafeClub.sol`

#### Étape 2: Installer OpenZeppelin

Dans Remix:
1. Allez dans le panneau de gauche "File Explorer"
2. Les imports OpenZeppelin se résoudront automatiquement
3. Ou utilisez le plugin "DEPENDENCIES" pour installer:
   ```
   @openzeppelin/contracts
   ```

#### Étape 3: Compiler le Contrat

1. Allez dans l'onglet "Solidity Compiler" (icône S)
2. Sélectionnez la version du compilateur: `0.8.x`
3. Cliquez sur "Compile SafeClub.sol"
4. Vérifiez qu'il n'y a pas d'erreurs

#### Étape 4: Déployer

1. Allez dans l'onglet "Deploy & Run Transactions"
2. **Environment**: Sélectionnez "Injected Provider - MetaMask"
3. Connectez votre MetaMask
4. **Contract**: Sélectionnez "SafeClub"
5. Cliquez sur "Deploy"
6. Confirmez la transaction dans MetaMask
7. **Notez l'adresse du contrat déployé**

## 📖 Guide d'Utilisation

### 1. Ajouter des Membres (Owner uniquement)

```solidity
addMember(0xAddresseDuMembre)
```

### 2. Déposer des Fonds

Envoyez simplement des ETH à l'adresse du contrat via MetaMask ou:
```solidity
// Transférer par exemple 10 ETH
// Utilisez la fonction "Transact" avec une Value de 10 ETH
```

### 3. Consulter le Solde

```solidity
getBalance()
// Retourne le solde en Wei
```

### 4. Créer une Proposition (Membres uniquement)

```solidity
createProposal(
    "Achat de matériel informatique",  // description
    0xAdresseDestinataire,              // recipient
    2000000000000000000,                // amount (2 ETH en Wei)
    7                                   // durée: 7 jours
)
```

### 5. Voter sur une Proposition (Membres uniquement)

```solidity
vote(
    1,     // proposalId
    true   // true = POUR, false = CONTRE
)
```

### 6. Vérifier si une Proposition est Acceptée

```solidity
isProposalAccepted(1)  // proposalId
// Retourne true si votesFor > 50% du nombre total de membres
```

### 7. Exécuter une Proposition (Membres uniquement)

```solidity
executeProposal(1)  // proposalId
// Exécute seulement si:
// - Deadline passée
// - Majorité absolue atteinte
// - Fonds suffisants
// - Pas déjà exécutée
```

## 🧪 Tests

### Scénario de Test Complet

Consultez `docs/test-scenarios.md` pour un scénario détaillé couvrant:

1. ✅ Déploiement du contrat
2. ✅ Ajout de 4 membres
3. ✅ Dépôt de 10 ETH
4. ✅ Création d'une proposition de 2 ETH
5. ✅ Vote de 3 membres POUR et 1 CONTRE
6. ✅ Exécution de la proposition acceptée
7. ❌ Tentative de double vote (échec)
8. ❌ Tentative de vote après deadline (échec)

### Résultats Attendus

- **Majorité absolue**: Avec 4 membres, il faut au moins 3 votes POUR
- **Protection**: Impossible de voter deux fois
- **Deadline**: Impossible de voter après expiration

## 📊 Analyse de Sécurité

Le contrat a été analysé avec **Slither** (voir `docs/security-report.md`).

Principales protections:
- ✅ Reentrancy Guard sur `executeProposal()`
- ✅ Checks-Effects-Interactions Pattern
- ✅ Custom Errors pour économiser le gas
- ✅ Modifiers pour le contrôle d'accès
- ✅ Validations strictes sur tous les inputs

## 🌐 Interface Web (Optionnel)

Une interface web est disponible dans le dossier `web/`:

1. Ouvrez `web/index.html` dans votre navigateur
2. Connectez MetaMask
3. Collez l'adresse du contrat déployé
4. Interagissez avec le contrat via l'interface graphique

## 📝 Règles de Décision

### Acceptation d'une Proposition

Une proposition est acceptée SI ET SEULEMENT SI:

```
votesFor > (memberCount / 2)
```

**Exemples**:
- 3 membres → minimum 2 votes POUR
- 4 membres → minimum 3 votes POUR
- 5 membres → minimum 3 votes POUR
- 10 membres → minimum 6 votes POUR

Cette règle garantit une **majorité absolue** des membres.

## 👥 Équipe

Projet réalisé dans le cadre du module Blockchain - ING 4
- TEK-UP University

## 📄 License

MIT License - voir le fichier LICENSE pour plus de détails

## 🔗 Ressources

- [Documentation Solidity](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Remix IDE](https://remix.ethereum.org/)
- [MetaMask](https://metamask.io/)

## ⚠️ Avertissement

Ce contrat est développé à des fins éducatives. Pour une utilisation en production, effectuez un audit de sécurité complet par des professionnels.

---

**Version**: 1.0.0  
**Date**: Décembre 2025
