import { AppDataSource } from "./src/data-source";
import { Bank } from "./src/entity/Bank";

async function check() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Bank);
    const banks = await repo.findByIds(["B0226011", "B0226010", "B022609", "B0226009"]);
    console.log("Found banks:");
    banks.forEach(b => console.log(b.bankId, b.name));
    process.exit(0);
}
check().catch(console.error);
