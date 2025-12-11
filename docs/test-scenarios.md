# Scénarios de Test - SafeClub

## Vue d'ensemble

Ce document détaille les scénarios de test pour le smart contract SafeClub. Les tests couvrent toutes les fonctionnalités principales ainsi que les cas limites et les tentatives d'exploitation.

## Environnement de Test

- **Plateforme**: Remix IDE
- **VM**: JavaScript VM (London)
- **Compilateur**: Solidity 0.8.x
- **Comptes de test**: Minimum 5 comptes fournis par Remix

## Configuration Initiale

### Comptes de Test

Pour les tests, nous utiliserons:
- **Account 0** (Owner): Déployeur du contrat, owner initial
- **Account 1** (Alice): Membre du club
- **Account 2** (Bob): Membre du club
- **Account 3** (Charlie): Membre du club
- **Account 4** (Non-membre): Pour tester les restrictions d'accès

## Scénario Complet de Test

### 📝 Test 1: Déploiement et Configuration Initiale

**Objectif**: Vérifier que le contrat se déploie correctement et que l'owner est configuré

**Actions**:
1. Compiler `SafeClub.sol` avec Solidity 0.8.x
2. Déployer le contrat depuis Account 0
3. Vérifier que Account 0 est membre automatiquement

**Vérifications**:
```solidity
isMember(Account0) // Doit retourner true
memberCount()      // Doit retourner 1
getBalance()       // Doit retourner 0
```

**Résultat attendu**: ✅ Déploiement réussi, owner est membre

---

### 👥 Test 2: Ajout de Membres

**Objectif**: Tester l'ajout de nouveaux membres

**Actions**:
1. Depuis Account 0 (owner), appeler:
   ```solidity
   addMember(Account1)  // Alice
   addMember(Account2)  // Bob
   addMember(Account3)  // Charlie
   ```

**Vérifications**:
```solidity
memberCount()         // Doit retourner 4
isMember(Account1)    // true
isMember(Account2)    // true
isMember(Account3)    // true
isMember(Account4)    // false (pas ajouté)
getMembers()          // Doit retourner [Account0, Account1, Account2, Account3]
```

**Résultat attendu**: ✅ 4 membres actifs

---

### 👥 Test 3: Tentative d'Ajout par Non-Owner (Échec attendu)

**Objectif**: Vérifier que seul l'owner peut ajouter des membres

**Actions**:
1. Basculer vers Account 1 (Alice)
2. Tenter d'appeler:
   ```solidity
   addMember(Account4)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur "Ownable: caller is not the owner"

---

### 💰 Test 4: Dépôt de Fonds dans le Vault

**Objectif**: Vérifier la réception d'ETH

**Actions**:
1. Depuis n'importe quel compte, envoyer 10 ETH à l'adresse du contrat
2. Ou utiliser la fonction Low Level Interactions dans Remix avec Value = 10 ETH

**Vérifications**:
```solidity
getBalance()  // Doit retourner 10000000000000000000 (10 ETH en Wei)
```

**Events émis**:
- `FundsReceived(from, 10 ETH, timestamp)`

**Résultat attendu**: ✅ 10 ETH dans le vault

---

### 📋 Test 5: Création d'une Proposition

**Objectif**: Créer une proposition de dépense valide

**Actions**:
1. Basculer vers Account 1 (Alice - membre)
2. Appeler:
   ```solidity
   createProposal(
       "Achat de matériel pour le club",  // description
       Account4,                           // recipient
       2000000000000000000,                // 2 ETH en Wei
       7                                   // 7 jours
   )
   ```

**Vérifications**:
```solidity
proposalCount()  // Doit retourner 1
getProposal(1)   // Doit retourner les détails de la proposition
```

**Events émis**:
- `ProposalCreated(1, Account1, "Achat...", 2 ETH, Account4, deadline)`

**Résultat attendu**: ✅ Proposition créée avec ID = 1

---

### 📋 Test 6: Tentative de Création par Non-Membre (Échec attendu)

**Objectif**: Vérifier que seuls les membres peuvent créer des propositions

**Actions**:
1. Basculer vers Account 4 (non-membre)
2. Tenter de créer une proposition

**Résultat attendu**: ❌ Transaction rejetée avec erreur `NotAMember()`

---

### 🗳️ Test 7: Vote sur la Proposition

**Objectif**: Tester le système de vote

**Actions**:
1. Basculer vers Account 0 (Owner) et voter:
   ```solidity
   vote(1, true)  // Vote POUR
   ```

2. Basculer vers Account 1 (Alice) et voter:
   ```solidity
   vote(1, true)  // Vote POUR
   ```

3. Basculer vers Account 2 (Bob) et voter:
   ```solidity
   vote(1, true)  // Vote POUR
   ```

4. Basculer vers Account 3 (Charlie) et voter:
   ```solidity
   vote(1, false)  // Vote CONTRE
   ```

**Vérifications**:
```solidity
getProposal(1)  
// votesFor = 3
// votesAgainst = 1

isProposalAccepted(1)  
// true (3 votes > 50% de 4 membres = 2.5, donc >= 3)

hasVotedOnProposal(1, Account0)  // true
hasVotedOnProposal(1, Account1)  // true
```

**Events émis**:
- `VoteCast(1, Account0, true, timestamp)`
- `VoteCast(1, Account1, true, timestamp)`
- `VoteCast(1, Account2, true, timestamp)`
- `VoteCast(1, Account3, false, timestamp)`

**Résultat attendu**: ✅ 3 votes POUR, 1 vote CONTRE, proposition acceptée

---

### 🗳️ Test 8: Tentative de Double Vote (Échec attendu)

**Objectif**: Vérifier qu'un membre ne peut voter qu'une fois

**Actions**:
1. Toujours avec Account 0 qui a déjà voté
2. Tenter de voter à nouveau:
   ```solidity
   vote(1, false)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `AlreadyVoted()`

---

### 🗳️ Test 9: Tentative de Vote par Non-Membre (Échec attendu)

**Objectif**: Vérifier que seuls les membres peuvent voter

**Actions**:
1. Basculer vers Account 4 (non-membre)
2. Tenter de voter:
   ```solidity
   vote(1, true)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `NotAMember()`

---

### ⏰ Test 10: Tentative d'Exécution Avant la Deadline (Échec attendu)

**Objectif**: Vérifier qu'on ne peut pas exécuter avant la deadline

**Actions**:
1. Immédiatement après les votes (deadline pas encore passée)
2. Tenter:
   ```solidity
   executeProposal(1)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `DeadlineNotPassed()`

---

### ⏰ Test 11: Avancer le Temps (pour Remix)

**Objectif**: Simuler le passage du temps pour atteindre la deadline

**Actions dans Remix**:
1. Aller dans "Deploy & Run"
2. Dans "Advanced Options", il y a parfois un outil de temps
3. OU déployer avec une deadline très courte (ex: 1 minute au lieu de 7 jours)

**Alternative**: Redéployer avec `_durationInDays = 0` (pour tests uniquement)

---

### ✅ Test 12: Exécution d'une Proposition Acceptée

**Objectif**: Exécuter la proposition après la deadline

**Pré-conditions**:
- Deadline passée
- Majorité absolue atteinte (3 votes POUR sur 4 membres)
- Fonds suffisants (10 ETH dans le vault, proposition demande 2 ETH)

**Actions**:
1. Basculer vers n'importe quel membre (ex: Account 0)
2. Appeler:
   ```solidity
   executeProposal(1)
   ```

**Vérifications**:
```solidity
getBalance()  
// Doit retourner 8 ETH (10 - 2)

getProposal(1).executed  
// Doit retourner true
```

**Vérifier le solde de Account 4** (recipient):
- Devrait avoir reçu 2 ETH

**Events émis**:
- `ProposalExecuted(1, Account4, 2 ETH, timestamp)`

**Résultat attendu**: ✅ 2 ETH transférés, proposition marquée comme exécutée

---

### ✅ Test 13: Tentative de Double Exécution (Échec attendu)

**Objectif**: Vérifier qu'une proposition ne peut être exécutée qu'une fois

**Actions**:
1. Tenter d'exécuter à nouveau:
   ```solidity
   executeProposal(1)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `ProposalAlreadyExecuted()`

---

### ❌ Test 14: Proposition Rejetée (Pas de Majorité)

**Objectif**: Tester une proposition qui n'atteint pas la majorité

**Actions**:
1. Créer une nouvelle proposition:
   ```solidity
   createProposal("Test rejet", Account4, 1 ETH, 7 jours)
   // ID = 2
   ```

2. Voter avec seulement 1 POUR et 3 CONTRE:
   - Account 0: vote(2, false)
   - Account 1: vote(2, false)
   - Account 2: vote(2, false)
   - Account 3: vote(2, true)

3. Attendre la deadline

4. Tenter d'exécuter:
   ```solidity
   executeProposal(2)
   ```

**Vérifications**:
```solidity
isProposalAccepted(2)  // false (1 vote < 3 requis)
```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `ProposalNotAccepted()`

---

### 💰 Test 15: Proposition avec Montant > Solde (Échec attendu)

**Objectif**: Vérifier qu'on ne peut pas créer une proposition dépassant le solde

**Actions**:
1. Le vault contient maintenant 8 ETH
2. Tenter de créer une proposition de 10 ETH:
   ```solidity
   createProposal("Trop cher", Account4, 10 ETH, 7 jours)
   ```

**Résultat attendu**: ❌ Transaction rejetée avec erreur `InsufficientFunds()`

---

### 👥 Test 16: Suppression d'un Membre

**Objectif**: Tester la suppression d'un membre

**Actions**:
1. Basculer vers Account 0 (owner)
2. Appeler:
   ```solidity
   removeMember(Account3)  // Retirer Charlie
   ```

**Vérifications**:
```solidity
memberCount()         // Doit retourner 3
isMember(Account3)    // false
```

**Events émis**:
- `MemberRemoved(Account3, timestamp)`

**Résultat attendu**: ✅ Membre retiré, count mis à jour

---

## Résumé des Tests

| # | Test | Type | Résultat Attendu |
|---|------|------|------------------|
| 1 | Déploiement | Success | ✅ Owner est membre |
| 2 | Ajout membres | Success | ✅ 4 membres |
| 3 | Ajout par non-owner | Failure | ❌ Access denied |
| 4 | Dépôt 10 ETH | Success | ✅ Vault = 10 ETH |
| 5 | Création proposition | Success | ✅ Proposal ID = 1 |
| 6 | Création par non-membre | Failure | ❌ Not a member |
| 7 | Votes (3 POUR, 1 CONTRE) | Success | ✅ Acceptée |
| 8 | Double vote | Failure | ❌ Already voted |
| 9 | Vote non-membre | Failure | ❌ Not a member |
| 10 | Exécution avant deadline | Failure | ❌ Deadline not passed |
| 11 | Avancer le temps | Setup | ⏰ Deadline passée |
| 12 | Exécution acceptée | Success | ✅ 2 ETH transférés |
| 13 | Double exécution | Failure | ❌ Already executed |
| 14 | Proposition rejetée | Failure | ❌ Not accepted |
| 15 | Montant > solde | Failure | ❌ Insufficient funds |
| 16 | Suppression membre | Success | ✅ Membre retiré |

## Calcul de la Majorité Absolue

**Formule**: `votesFor > (memberCount / 2)`

**Exemples**:
- 4 membres → requis: 3 votes POUR (> 2)
- 5 membres → requis: 3 votes POUR (> 2.5)
- 10 membres → requis: 6 votes POUR (> 5)

## Notes pour la Présentation

Pour la séance de validation finale (10-15 min):

1. **Préparer le scénario**: Tests 1 → 5 → 7 → 12 (flux complet)
2. **Montrer une protection**: Test 8 (double vote) ou Test 10 (deadline)
3. **Expliquer la sécurité**: Reentrancy protection dans executeProposal()
4. **Questions attendues**:
   - Comment gérez-vous la reentrancy? → ReentrancyGuard + CEI pattern
   - Pourquoi majorité absolue? → Plus sûr que majorité simple
   - Que se passe-t-il si deadline jamais atteinte? → Fonds bloqués (limites du système)

## Recommandations

1. **Tester dans l'ordre**: Suivre la séquence des tests
2. **Prendre des screenshots**: Pour le rapport et la présentation
3. **Noter les adresses**: Garder une trace des adresses de comptes et du contrat
4. **Vérifier les events**: Dans la console Remix après chaque transaction
5. **Mesurer le gas**: Noter les coûts pour le rapport

---

**Version**: 1.0  
**Auteur**: Équipe SafeClub  
**Date**: Décembre 2025
