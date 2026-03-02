import "reflect-metadata";
import { AppDataSource } from "./src/data-source";
import { BankDocumentConfig } from "./src/entity/BankDocumentConfig";

AppDataSource.initialize().then(async () => {
    console.log("Connected to DB!");
    const configRepo = AppDataSource.getRepository(BankDocumentConfig);
    console.log("Configs:");
    const all = await configRepo.find({ relations: ["bank"] });
    if (all.length === 0) console.log("NO CONFIGS FOUND IN DB!");
    for (const c of all) {
        console.log(`- Bank: ${c.bank?.name}, BankID: ${c.bank?.bankId}, AppType: ${c.applicantType}, LoanType: ${c.loanType}, Docs: ${c.requiredDocuments}`);
    }
    process.exit(0);
}).catch(e => console.error("DB ERROR: ", e));
