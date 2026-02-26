const targetOpp = { opportunityId: "OPP1", proposalGroupId: null, banks: [] };
let siblings: any[] = [targetOpp];
const currentBankIdToOppId = new Map<string, string>();

for (const sib of siblings) {
    if (sib.banks && sib.banks.length > 0) {
        currentBankIdToOppId.set(sib.banks[0].bankId, sib.opportunityId);
    } else if (!sib.proposalGroupId && siblings.length === 1 && (!sib.banks || sib.banks.length === 0)) {
        currentBankIdToOppId.set("NO_BANK", sib.opportunityId);
    }
}

let finalActiveOpportunities: any[] = [];
let primaryOppId = targetOpp.opportunityId;
const rawBanks = ["B1", "B2", "B3"];
const incomingBankIds = new Set(rawBanks);
const currentBankIds = new Set(Array.from(currentBankIdToOppId.keys()).filter(k => k !== "NO_BANK"));

for (const bankId of currentBankIds) {
    console.log("Existing bank:", bankId);
}

for (const bankId of rawBanks) {
    if (!currentBankIds.has(bankId)) {
        if (currentBankIdToOppId.has("NO_BANK") && finalActiveOpportunities.length === 0) {
            console.log(`Using NO_BANK slot for ${bankId}`);
            finalActiveOpportunities.push({ id: currentBankIdToOppId.get("NO_BANK"), bank: bankId });
            currentBankIdToOppId.delete("NO_BANK");
        } else {
            console.log(`Creating new sibling for ${bankId}`);
            finalActiveOpportunities.push({ id: `NEW-${bankId}`, bank: bankId });
        }
    }
}

console.log(finalActiveOpportunities);
