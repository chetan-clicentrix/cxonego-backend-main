import { AppDataSource } from "../data-source";
import { Account } from "../entity/Account";
import { DeleteResult, EntityManager, UpdateResult } from "typeorm";
import logger from "../common/logger";
import { Readable } from "stream";
import { Lead } from "../entity/Lead";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { SocialMedia } from "../entity/SocialMedia";
import { Contact } from "../entity/Contact";
import * as csv from "csv-parser";
import {
  accountDecryption,
  orgnizationDecryption,
  userDecryption,
} from "./decryption.service";
import { auditType, decrypt, encryption, roleNames } from "../common/utils";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { User } from "../entity/User";
import { Audit } from "../entity/Audit";
import { userInfo } from "../interfaces/types";
import { Organisation } from "../entity/Organisation";
import * as XLSX from "xlsx";

class AccountServices {
  async getAllAccounts(userInfo: userInfo) {
    const accounts = await AppDataSource.getRepository(Account)
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.owner", "user")
      .leftJoinAndSelect("account.organization", "organisation")
      .where("organisation.organisationId = :organisationId", {
        organisationId: userInfo.organizationId,
      })
      .select(["account", "user.userId", "user.firstName", "user.lastName"])
      .orderBy("account.updatedAt", "DESC")
      .getMany();

    for (let account of accounts) {
      account = await accountDecryption(account);
      account.owner = await userDecryption(account.owner);
    }
    return accounts;
  }

  async getAccounts(
    ownerId: string,
    _role: Role[],
    search: string | undefined,
    page: number,
    limit: number,
    country: string[],
    state: string,
    city: string,
    status: string[],
    industry: string[],
    businessType: string[],
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    organizationId: string | null,
    view: string | null
  ) {
    try {
      const countryArray: string[] = [];
      if (country) {
        for (let i = 0; i < country.length; i++) {
          countryArray.push(encryption(country[i]));
        }
      }

      const industryArray: string[] = [];
      if (industry) {
        for (let i = 0; i < industry.length; i++) {
          industryArray.push(encryption(industry[i]));
        }
      }

      const businessTypeArray: string[] = [];
      if (businessType) {
        for (let i = 0; i < businessType.length; i++) {
          businessTypeArray.push(encryption(businessType[i]));
        }
      }
      /*
            if(role.length===1 && role[0].roleName===roleNames.SALESPERSON){
            
            }else{

            }
            */

      //view=="myView" || view==="null"  for admin,manager,salesperson
      //view=="myTeamView"             for admin and manager

      let accountsRepo;
      if (view == "myView" || view === "null") {
        accountsRepo = await AppDataSource.getRepository(Account)
          .createQueryBuilder("account")
          .select()
          .leftJoinAndSelect("account.owner", "user")
          .where("account.ownerId=:ownerId", { ownerId: ownerId })
          .andWhere("account.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("account.updatedAt", "DESC");
      } else {
        accountsRepo = await AppDataSource.getRepository(Account)
          .createQueryBuilder("account")
          .select()
          .leftJoinAndSelect("account.owner", "user")
          .where("account.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("account.updatedAt", "DESC");
      }

      if (status && status.length > 0) {
        accountsRepo.andWhere("account.status IN (:status)", { status });
      }

      if (country && country.length > 0) {
        accountsRepo.andWhere("account.country IN (:country)", {
          country: countryArray,
        });
      }

      if (industry && industry.length > 0) {
        accountsRepo.andWhere("account.industry IN (:industry)", {
          industry: industryArray,
        });
      }

      if (businessType && businessType.length > 0) {
        accountsRepo.andWhere("account.businessType IN (:businessType)", {
          businessType: businessTypeArray,
        });
      }

      if (createdAt != undefined) {
        accountsRepo.orderBy(
          "account.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        accountsRepo.orderBy(
          "account.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          accountsRepo.andWhere(
            "DATE(account.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const accounts = await accountsRepo.getMany();

      for (let account of accounts) {
        account = await accountDecryption(account);
        if (account.owner) account.owner = await userDecryption(account.owner);
      }
      let searchedData: Account[] = [];
      let skip = 0;
      if (search) {
        skip = 1;
        searchedData = await accounts.filter((account) => {
          if (
            account?.accountName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.country
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.state
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.city
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.companySize
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.website
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.industry
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.businessType
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.CurrencyCode?.toLowerCase().includes(
              String(search).toLowerCase()
            ) ||
            account?.status
              ?.toLowerCase()
              ?.includes(String(search).toLowerCase()) ||
            account?.annualRevenue
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.email
              ?.toLowerCase()
              ?.includes(String(search).toLowerCase()) ||
            account?.phone
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.countryCode
              ?.toLowerCase()
              ?.includes(String(search).toLowerCase()) ||
            account?.address
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.description
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.area
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.owner?.firstName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.owner?.lastName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.clientCategory
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            account?.segment
              ?.toLowerCase()
              .includes(String(search).toLowerCase())
          ) {
            return true;
          }
          return false;
        });
      }

      if (state || city) {
        skip = 1;
        searchedData = await accounts.filter((account) => {
          const matchState =
            !state ||
            account.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || account.city?.toLowerCase().includes(city.toLowerCase());
          return matchState && matchCity;
        });
      }

      let total = 0;
      if (skip == 0 && searchedData.length == 0) {
        total = accounts.length;
        searchedData = accounts;
      } else {
        total = searchedData.length;
      }
      searchedData = searchedData.slice((page - 1) * limit, page * limit);

      const pagination = {
        total: total,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;
    } catch (error) {
      logger.error(error);
      return;
    }
  }
  async isAccountExists(accountId: string) {
    const account = await AppDataSource.getRepository(Account).findOne({
      where: {
        accountId: accountId,
      },
    });
    return account ? true : false;
  }
  async getAccount(accountId: string) {
    try {
      let account = await AppDataSource.getRepository(Account).findOne({
        where: {
          accountId: accountId,
        },
      });

      if (!account) throw new ResourceNotFoundError("Account not found");

      account = await accountDecryption(account);

      if (account) {
        account.organization = await orgnizationDecryption(
          account.organization
        );
      }

      if (account.owner) {
        account.owner = await userDecryption(account.owner);
        account.owner.organisation = await orgnizationDecryption(
          account.owner.organisation
        );
      }

      return account;
    } catch (error) {
      logger.error(error);
      return;
    }
  }
  async isAccountNameExists(
    accountName: string,
    organizationId: string | null
  ) {
    let accountsRepo = await AppDataSource.getRepository(Account)
      .createQueryBuilder("account")
      .select()
      .where("account.accountName=:accountName", {
        accountName: encryption(accountName),
      })
      .andWhere("account.organizationId=:organizationId", {
        organizationId: organizationId,
      });

    const account = await accountsRepo.getOne();

    return account ? true : false;
  }
  async getAccountId(date: Date) {
    const month = String(
      date.getMonth() + 1 >= 10
        ? date.getMonth() + 1
        : "0" + (date.getMonth() + 1)
    );
    const year = String(date.getFullYear().toString().slice(-2));
    const lastLead = await AppDataSource.getRepository(Account)
      .createQueryBuilder("Account")
      .withDeleted()
      .select()
      .orderBy("Account.createdAt", "DESC")
      .getOne();

    let accountNo = "00";
    const yearFromRecord = String(lastLead?.accountId.slice(3, 5)); //A022401
    const accountIdFromRecord = String(lastLead?.accountId.substring(5));

    if (year === yearFromRecord) {
      accountNo = accountIdFromRecord;
    }
    const accountId =
      "A" + month + year + "0" + (Number(accountNo) + 1).toString();

    return accountId;
  }
  async createAccount(
    payload: Account,
    userId: string,
    auth_time: number,
    organizationId: string | null,
    transactionEntityManager: EntityManager
  ) {
    if (await this.isAccountNameExists(payload.accountName, organizationId)) {
      throw new Error("This account name is already in use");
    }

    if (payload?.socialMediaLink?.[0]?.name) {
      const socialMedia = new SocialMedia();
      const socialMedias: SocialMedia[] = [];

      await payload.socialMediaLink?.map(async (social) => {
        socialMedia.name = String(social.name);
        socialMedia.url = social.url;
        socialMedias.push(await socialMedia.save());
      });
      payload.socialMediaLink = socialMedias;
    }

    const userRepo = AppDataSource.getRepository(User);
    const userData = await userRepo.findOne({ where: { userId: userId } });
    if (userData) {
      payload.owner = userData as User;
    }

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    const account = new Account({
      ...payload,
      accountId: await this.getAccountId(new Date()),
    } as Account);
    let accountData = await account.save();

    const auditId = String(auth_time) + userId;
    await this.createAuditLogHandler(
      transactionEntityManager,
      accountData,
      auditId
    );
    accountData = await accountDecryption(accountData);
    accountData.owner = await userDecryption(accountData.owner);
    accountData.organization = await orgnizationDecryption(
      accountData.organization
    );
    return accountData;
  }
  async updateAccount(
    accountId: string,
    payload: Account,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    payload.modifiedBy = user.email;
    const accountRepo = AppDataSource.getRepository(Account);
    const accountData = await accountRepo.findOneBy({ accountId: accountId });
    if (!accountData) {
      return;
    }

    if (payload?.socialMediaLink?.[0]?.name) {
      const socialMedia = new SocialMedia();
      const socialMedias: SocialMedia[] = [];

      payload.socialMediaLink?.map(async (social) => {
        socialMedia.name = String(social.name);
        socialMedia.url = social.url;
        socialMedias.push(await socialMedia.save());
      });
      payload.socialMediaLink = socialMedias;
    }

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    const userRepo = AppDataSource.getRepository(User);
    const userObj: User = payload.owner;
    if (payload.owner) {
      const userData = await userRepo.createQueryBuilder("user")
        .where("user.userId = :userId", { userId: userObj.userId })
        .andWhere("user.organisation = :organisation", {
          organisation: user.organizationId,
        })
        .getOne();
      if (userData) {
        payload.owner = userData as User;
      } else {
        throw new ResourceNotFoundError("User not found in this organization.");
      }
    }

    const account = new Account(payload);
    const update: UpdateResult = await accountRepo.update(accountId, account);
    const auditId = String(user.auth_time) + user.userId;
    await this.updateAuditLogHandler(
      transactionEntityManager,
      accountData,
      account,
      payload.modifiedBy,
      auditId
    );
    return update;
  }

  async deleteAccount(
    accountId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    try {
      const accountRepository = transactionEntityManager.getRepository(Account);
      const account = await accountRepository.findOne({
        where: { accountId: accountId },
      });
      if (!account) {
        throw new Error("Account does not exist");
      }

      await AppDataSource.getRepository(Account).softDelete(accountId);
      const auditId = String(user.auth_time) + user.userId;

      await accountRepository.update(accountId, { modifiedBy: user.email });
      const accountData = await accountRepository.findOne({
        withDeleted: true, // Include soft-deleted entities
        where: { accountId: accountId },
      });
      if (accountData) {
        await this.deleteAuditLogHandler(
          transactionEntityManager,
          accountData,
          auditId
        );
      }
      return account;
    } catch (error) {
      throw new Error("Account does not exist");
    }
  }
  async getAccountUsingCSV(file: any, owner: string) {
    try {
      const accounts: Array<Account> = [];
      const stream = Readable.from(file.buffer.toString());
      await stream
        .pipe(csv())
        .on("data", (row: any) => {
          if (
            row.accountName &&
            row.industry &&
            row.city &&
            row.country &&
            row.state
          ) {
            accounts.push({ ...row, owner: owner });
          }
        })
        .on("end", () => {
          return accounts;
        });
      return this.uploadCSV(accounts);
    } catch (error) {
      throw new Error("please upload csv file and try again");
    }
  }
  async uploadCSV(accounts: Array<Account>) {
    try {
      const uniqueLeads = new Set<string>();
      const unique: Account[] = [];
      let duplicates: number = 0;
      for (const account of accounts) {
        const accountString = JSON.stringify(account);
        if (!uniqueLeads.has(accountString)) {
          uniqueLeads.add(accountString);
          unique.push(account);
        } else {
          duplicates++;
        }
      }
      return { unique, duplicate: duplicates };
    } catch (error) {
      throw new Error("Please upload a correct CSV file and try again");
    }
  }

  async uploadAccountUsingExcel(
    file: any,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const accounts: Account[] = [];

      // Read the .xlsx file
      const workbook = XLSX.read(file.buffer, { type: "buffer" });

      // Assuming the accounts are in the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the sheet to JSON
      const rows = XLSX.utils.sheet_to_json<Account>(worksheet);
      // console.log("rows is : ",rows);

      // Define the expected columns
      const expectedColumns = [
        "accountName",
        "description",
        "companySize",
        "email",
        "phone",
        "address",
        "country",
        "state",
        "city",
        "website",
        "status",
        "industry",
        "CurrencyCode",
        "annualRevenue",
        "businessType",
        "countryCode",
      ];

      // Check if the first row (columns) match the expected columns
      if (rows.length > 0) {
        const actualColumns = Object.keys(rows[0]);

        // Validate column headings
        const isValid = expectedColumns.every((col) =>
          actualColumns.includes(col)
        );
        // console.log("isValid is : ", isValid);

        if (!isValid) {
          throw new Error(
            "Invalid excel file. Please download a sample excel file from our website and edit your data"
          );
        } else {
          console.log("Excel file is valid.");
        }
      } else {
        throw new Error(
          "Invalid excel file. Please download a sample excel file from our website and edit your data"
        );
      }

      // Process each row
      for (const row of rows) {
        if (row.accountName && row.description && row.companySize) {
          row.countryCode = `+${row.countryCode}`;
          row.phone = `${row.phone}`;
          row.annualRevenue = `${row.annualRevenue}`;
          row.companySize = `${row.companySize}`;
          accounts.push(row);
        }
      }

      return this.uploadExcelAccounts(
        accounts,
        user,
        filename,
        transactionEntityManager
      );
    } catch (error) {
      throw new Error(
        "Invalid excel file. Please download a sample excel file from our website and edit your data"
      );
    }
  }

  async uploadExcelAccounts(
    accountsArr: Array<Account>,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const uniqueAccounts = new Set<string>();
      const accounts: Account[] = [];

      for (const account of accountsArr) {
        const accountString = JSON.stringify(account);
        if (!uniqueAccounts.has(accountString)) {
          uniqueAccounts.add(accountString);
          accounts.push(account);
        }
      }

      const totalCount = accounts.length;
      let SuccessCount = 0;
      let DuplicateCount = 0;
      const duplicateAccountData: Array<{
        accountName: string;
        email: string;
        phone: string;
      }> = [];
      let errorCount = 0;
      try {
        const accountRepository = await transactionEntityManager.getRepository(
          Account
        );
        const organizationRepo = await AppDataSource.getRepository(
          Organisation
        );
        const userdata = await transactionEntityManager
          .getRepository(User)
          .createQueryBuilder("User")
          .where("User.userId = :userId", { userId: user.userId })
          .getOne();

        const arrayAccount: Array<Account> = [];

        // get accolunt list from table and check accountname is exist or not
        const existingDeletedAccounts = await transactionEntityManager
          .getRepository(Account)
          .createQueryBuilder("Account")
          .withDeleted() // This method includes soft-deleted rows in the result
          .where("Account.organizationId = :organizationId", {
            organizationId: user.organizationId,
          })
          .andWhere("Account.deletedAt IS NOT NULL")
          .getMany();

        const existingNonDeletedAccounts = await transactionEntityManager
          .getRepository(Account)
          .createQueryBuilder("Account")
          .where("Account.organizationId = :organizationId", {
            organizationId: user.organizationId,
          })
          .getMany();

        const existingDeletedAccountNames = new Set(
          existingDeletedAccounts.map((account) => decrypt(account.accountName))
        );
        const existingNonDeletedAccountNames = new Set(
          existingNonDeletedAccounts.map((account) =>
            decrypt(account.accountName)
          )
        );

        // console.log("existingDeletedAccountNames is : ",existingDeletedAccountNames);
        // console.log("existingNonDeletedAccountNames is : ",existingNonDeletedAccountNames);

        let count = 0;
        await Promise.all(
          accounts.map(async (account) => {
            const decryptedaccountName = `${account.accountName}`;
            //if exist then true otherwise false

            if (userdata) {
              account.owner = userdata;
            }

            if (user.organizationId) {
              const orgnizationData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
              });
              if (orgnizationData) account.organization = orgnizationData;
            }

            // account.accountId = await this.getAccountId(new Date()) ;

            let accountId = await this.getAccountId(new Date());
            account.accountId =
              accountId.slice(0, -1) +
              (Number(accountId.slice(-1)) + count++).toString();

            // console.log("account Id is : ",account.accountId);
            if (account.accountName)
              account.accountName = encryption(account.accountName);
            if (account.description)
              account.description = encryption(account.description);
            if (account.companySize)
              account.companySize = encryption(account.companySize);
            if (account.email) account.email = encryption(account.email);
            if (account.phone) account.phone = encryption(account.phone);
            if (account.address) account.address = encryption(account.address);
            if (account.country) account.country = encryption(account.country);
            if (account.state) account.state = encryption(account.state);
            if (account.city) account.city = encryption(account.city);
            if (account.website) account.website = encryption(account.website);
            if (account.status) account.status = account.status;
            if (account.industry)
              account.industry = encryption(account.industry);
            if (account.CurrencyCode)
              account.CurrencyCode = encryption(account.CurrencyCode);
            if (account.annualRevenue)
              account.annualRevenue = encryption(account.annualRevenue);
            if (account.businessType)
              account.businessType = encryption(account.businessType);
            if (account.countryCode)
              account.countryCode = encryption(account.countryCode);

            if (existingNonDeletedAccountNames.has(decryptedaccountName)) {
              DuplicateCount++;
              // console.log("DuplicateCount is : ", DuplicateCount);
              duplicateAccountData.push({
                accountName: decrypt(account.accountName),
                email: decrypt(account.email),
                phone: decrypt(account.phone),
              });
            } else {
              if (existingDeletedAccountNames.has(decryptedaccountName)) {
                arrayAccount.push(account);
              } else {
                arrayAccount.push(account);
              }

              SuccessCount++;
            }
          })
        );

        await accountRepository.save(arrayAccount);
        console.log("This line is executed");
      } catch (error) {
        console.log("error is : ", error);
        errorCount = totalCount - SuccessCount - DuplicateCount;
      }

      const accountDataSummery = {
        totalCount: totalCount,
        SuccessCount: SuccessCount,
        errorCount: errorCount,
        DuplicateCount: DuplicateCount,
        filename: filename,
        duplicateAccountData: duplicateAccountData,
      };

      return accountDataSummery;
    } catch (error) {
      throw new Error("Please upload a correct xlsx file and try again");
    }
  }

  async leadByAccountId(
    accountId: string,
    search: string | undefined,
    page: number,
    limit: number
  ) {
    try {
      if (!(await this.isAccountExists(accountId))) {
        throw new ResourceNotFoundError("Account not found");
      }
      const leadRepository = AppDataSource.getRepository(Lead);
      let leads = await leadRepository
        .createQueryBuilder("lead")
        .where("lead.company Like :account", { account: `%${accountId}%` })
        .getMany();
      leads.map((lead) => {
        if (lead?.fullName) lead.fullName = decrypt(lead.fullName);
        if (lead?.phone) lead.phone = decrypt(lead.phone);
        if (lead?.country) lead.country = decrypt(lead.country);
        if (lead?.state) lead.state = decrypt(lead.state);
        if (lead?.city) lead.city = decrypt(lead.city);
        if (lead?.email) lead.email = decrypt(lead.email);
        if (lead?.title) lead.title = decrypt(lead.title);
        if (lead?.leadSource) lead.leadSource = decrypt(lead.leadSource);
        if (lead?.description) lead.description = decrypt(lead.description);
        if (lead?.countryCode) lead.countryCode = decrypt(lead.countryCode);
      });

      let searchedData: Lead[] = [];
      let skip = 0;
      if (search) {
        skip = 1;
        searchedData = await leads.filter((lead) => {
          if (
            lead?.fullName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.countryCode
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.phone
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.title
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.email
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.country
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.state
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.city
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.leadSource
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.rating
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            lead?.price
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())
          ) {
            return true;
          }
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = leads;
      }

      const pagination = {
        total: searchedData.length,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;

      return leads;
    } catch (error) {
      console.log(error);
      throw new Error("Account not found please try again");
    }
  }
  async contactByAccountId(
    accountId: string,
    search: string | undefined,
    page: number,
    limit: number
  ) {
    try {
      if (!(await this.isAccountExists(accountId))) {
        throw new ResourceNotFoundError("Account not found");
      }
      const contactRepository = AppDataSource.getRepository(Contact);
      const contacts = await contactRepository
        .createQueryBuilder("contact")
        .where("contact.company Like :account", { account: `%${accountId}%` })
        .getMany();
      contacts.map((contact) => {
        if (contact.fullName) contact.fullName = decrypt(contact.fullName);
        if (contact.countryCode)
          contact.countryCode = decrypt(contact.countryCode);
        if (contact.phone) contact.phone = decrypt(contact.phone);
        if (contact.area) contact.area = decrypt(contact.area);
        if (contact.city) contact.city = decrypt(contact.city);
        if (contact.state) contact.state = decrypt(contact.state);
        if (contact.country) contact.country = decrypt(contact.country);
        if (contact.timeline) contact.timeline = decrypt(contact.timeline);
        if (contact.email) contact.email = decrypt(contact.email);
        if (contact.addressLine)
          contact.addressLine = decrypt(contact.addressLine);
        if (contact.industry) contact.industry = decrypt(contact.industry);
        if (contact.designation)
          contact.designation = decrypt(contact.designation);
        if (contact.description)
          contact.description = decrypt(contact.description);
        if (contact.social) contact.social = decrypt(contact.social);
      });
      let searchedData: Contact[] = [];
      let skip = 0;
      if (search && contacts.length > 0) {
        skip = 1;
        searchedData = contacts.filter((contact) => {
          if (
            contact?.fullName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.countryCode
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.country
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.phone
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.email
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.description
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.addressLine
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.area
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.city
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.industry
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.state
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.designation
              .toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.social
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.timeline
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.status
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.favourite
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.contactType
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.company?.accountName
              ?.toLowerCase()
              .includes(String(search).toLowerCase())
          ) {
            return true;
          }
          return false;
        });
      }

      let total = 0;
      if (skip == 0 && searchedData.length == 0) {
        total = contacts.length;
        searchedData = contacts;
      } else {
        total = searchedData.length;
      }
      searchedData = searchedData.slice((page - 1) * limit, page * limit);
      const pagination = {
        total: total,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;
    } catch (error) {
      throw new Error("Account not found please try again");
    }
  }
  async bulkDeleteAccount(
    accountIds: Array<string>,
    userId: string,
    auth_time: number,
    email: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const auditId = String(auth_time) + userId;
      const accountRepository = await transactionEntityManager.getRepository(
        Account
      );
      const { accountCanBeDelete, accountCanNotBeDeleted } =
        await this.isAccountExistsByIdToBulkdelete(
          transactionEntityManager,
          accountIds
        );
      for (const accountId of accountCanBeDelete) {
        await accountRepository.softDelete(accountId);
        await accountRepository.update(accountId, { modifiedBy: email });
        const account = await accountRepository.findOne({
          withDeleted: true, // Include soft-deleted entities
          where: { accountId: accountId },
        });
        if (account) {
          await this.deleteAuditLogHandler(
            transactionEntityManager,
            account,
            auditId
          );
        }
      }
      return {
        deleted: accountCanBeDelete,
        accountNotFound: accountCanNotBeDeleted,
      };
    } catch (error) {
      return;
    }
  }

  async isAccountExistsByIdToBulkdelete(
    transactionEntityManager: EntityManager,
    accountIds: Array<string>
  ) {
    const accountRepository = transactionEntityManager.getRepository(Account);
    const accountCanNotBeDeleted: Array<string> = [];
    const accountCanBeDelete: Array<string> = [];
    for (const accountId of accountIds) {
      const account = await accountRepository.findOne({
        where: {
          accountId: accountId,
        },
      });
      if (account) {
        accountCanBeDelete.push(accountId);
      } else {
        accountCanNotBeDeleted.push(accountId);
      }
    }
    return { accountCanBeDelete, accountCanNotBeDeleted };
  }

  async partiallyUpdateAccount(accountId: string, payload: Account) {
    try {
      if (!(await this.isAccountExists(accountId))) {
        return;
      }
      const account: UpdateResult = await AppDataSource.getRepository(
        Account
      ).update(accountId, { ...payload });
      return account;
    } catch (error) {
      logger.error(error);
      return;
    }
  }

  async createAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldaccountRecord: Account,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const companyname = decrypt(oldaccountRecord.accountName);
    const description = `New account created with name ${companyname} `;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.INSERTED,
      company: oldaccountRecord,
      owner: oldaccountRecord.owner,
      modifiedBy: oldaccountRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async updateAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldcompanyRecord: Account,
    updatedAccountRecord: Account,
    modifiedBy: string,
    auditId: string
  ) {
    const updatedAccount = Object(updatedAccountRecord);
    const oldAccount = Object(oldcompanyRecord);

    const auditRepository = transactionEntityManager.getRepository(Audit);
    let description = "";
    const predescription = await auditRepository.findOne({
      where: { auditId: auditId },
    });
    if (predescription) {
      description = predescription.description;
    }
    //only encrypted columns add here
    const keywords = [
      "accountName",
      "description",
      "country",
      "state",
      "city",
      "companySize",
      "website",
      "industry",
      "businessType",
      "CurrencyCode",
      "annualRevenue",
      "address",
      "area",
      "email",
      "phone",
      "countryCode",
    ];

    for (let key in updatedAccount) {
      if (`${key}` === "owner") {
        if (updatedAccount[key].userId !== oldAccount[key].userId) {
          const oldOwnerName =
            decrypt(oldAccount[key].firstName) +
            " " +
            decrypt(oldAccount[key].lastName);
          const updatedOwnerName =
            decrypt(updatedAccount[key].firstName) +
            " " +
            decrypt(updatedAccount[key].lastName);
          description += `${key} ${oldOwnerName} --> ${updatedOwnerName} `;
        }
      } else if (updatedAccount[key] !== oldAccount[key]) {
        if (
          `${key}` !== "owner" &&
          `${key}` !== "modifiedBy" &&
          `${key}` !== "organization"
        ) {
          if (keywords.includes(key)) {
            description +=
              key +
              " " +
              (oldAccount[key] !== null ? decrypt(oldAccount[key]) : "null") +
              " --> " +
              (updatedAccount[key] !== null
                ? decrypt(updatedAccount[key])
                : "null") +
              " ";
          } else {
            description += `${key} ${oldAccount[key]} --> ${updatedAccount[key]} `;
          }
        }
      }
    }

    const companyname = decrypt(oldcompanyRecord.accountName);

    if (!predescription)
      description = `${companyname} Account changed from ${description}`;

    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.UPDATED,
      company: oldAccount,
      owner: oldcompanyRecord.owner,
      modifiedBy: modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.insert(auditInstance);
  }

  async deleteAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldAccountRecord: Account,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const companyname = decrypt(oldAccountRecord.accountName);
    const description = `account has been deleted with name ${companyname}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.DELETED,
      company: oldAccountRecord,
      owner: oldAccountRecord.owner,
      modifiedBy: oldAccountRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async getAccountsByOrgnizationId(organizationId: string | null) {
    try {
      const accountsRepo = await AppDataSource.getRepository(Account)
        .createQueryBuilder("account")
        .select()
        .where("account.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("account.updatedAt", "DESC");
      const accounts = await accountsRepo.getMany();
      for (let account of accounts) {
        account =
          account !== null && account !== undefined
            ? await accountDecryption(account as Account)
            : account;
      }
      return accounts;
    } catch (error) {
      logger.error(error);
      return;
    }
  }
}

export default AccountServices;
