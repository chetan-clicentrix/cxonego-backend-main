import { AppDataSource } from "../data-source";
import { LeadSchemaType } from "../schemas/lead.schemas";
// import * as csv from "csv-parser";
// import { Readable } from "stream";
// import * as fs from "fs";
import { EntityManager, Repository } from "typeorm";
import { Lead } from "../entity/Lead";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { Account } from "../entity/Account";
import { auditType, encryption, roleNames } from "../common/utils";
import { decrypt } from "../common/utils";
import { Contact } from "../entity/Contact";
import {
  accountDecryption,
  contactDecryption,
  leadDecryption,
  orgnizationDecryption,
  userDecryption,
} from "./decryption.service";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { Audit } from "../entity/Audit";
import { User } from "../entity/User";
import { userInfo } from "../interfaces/types";
import { Organisation } from "../entity/Organisation";
import * as XLSX from "xlsx";

class LeadService {
  async getAllLeads(userInfo: userInfo) {
    const leads = await AppDataSource.getRepository(Lead)
      .createQueryBuilder("lead")
      .leftJoinAndSelect("lead.company", "account")
      .leftJoinAndSelect("lead.contact", "contact")
      .leftJoinAndSelect("lead.owner", "user")
      .leftJoinAndSelect("lead.organization", "organisation")
      .andWhere("organisation.organisationId = :organizationId", {
        organizationId: userInfo.organizationId,
      })
      .select(["lead", "account", "contact", "user"])
      .orderBy("lead.updatedAt", "DESC")
      .getMany();

    for (let lead of leads) {
      lead = await leadDecryption(lead);
      if (lead.company) lead.company = await accountDecryption(lead.company);
      if (lead.contact) lead.contact = await contactDecryption(lead.contact);
      lead.owner = await userDecryption(lead.owner);
      console.log(lead.organization);
    }

    console.log(leads);

    return leads;
  }

  async getLeadId(date: Date) {
    const month = String(
      date.getMonth() + 1 >= 10
        ? date.getMonth() + 1
        : "0" + (date.getMonth() + 1)
    );

    const year = String(date.getFullYear().toString().slice(-2));
    const lastLead = await AppDataSource.getRepository(Lead)
      .createQueryBuilder("LeadEntity")
      .withDeleted()
      .select()
      .orderBy("LeadEntity.createdAt", "DESC")
      .getOne();

    let leadNo = "00";
    const yearFromRecord = String(lastLead?.leadId.slice(3, 5)); //L032409,L0324010

    const leadIdFromRecord = String(lastLead?.leadId.substring(5));

    if (year === yearFromRecord) {
      leadNo = leadIdFromRecord;
    }
    const leadId = "L" + month + year + "0" + (Number(leadNo) + 1).toString();
    return leadId;
  }

  async createAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldleadRecord: Lead,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const title = decrypt(oldleadRecord.title);
    const description = `New lead created with title ${title}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.INSERTED,
      lead: oldleadRecord,
      owner: oldleadRecord.owner,
      modifiedBy: oldleadRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async updateAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldleadRecord: Lead,
    updatedLeadRecord: Lead,
    modifiedBy: string,
    auditId: string
  ) {
    const updatedLead = Object(updatedLeadRecord);
    const oldLead = Object(oldleadRecord);

    const auditRepository = transactionEntityManager.getRepository(Audit);
    let description = "";
    const predescription = await auditRepository.findOne({
      where: { auditId: auditId },
    });
    if (predescription) {
      description = predescription.description;
    }

    //keys which are encrypted in table goes in if block and non encrypted goes in else block
    const keywords = [
      "firstName",
      "lastName",
      "phone",
      "title",
      "email",
      "country",
      "state",
      "city",
      "leadSource",
      "countryCode",
      "price",
      "description",
    ];
    for (let key in updatedLead) {
      if (`${key}` === "contact") {
        const oldContact = oldLead[key];
        const updatedContact = updatedLead[key];
        if (!oldContact && updatedContact) {
          description += `null --> ${decrypt(
            updatedContact.firstName
          )} ${decrypt(updatedContact.lastName)}`;
        } else if (oldContact && !updatedContact) {
          description += `${decrypt(oldContact.firstName)} ${decrypt(
            oldContact.lastName
          )} --> null`;
        } else if (
          oldContact != updatedContact &&
          updatedLead[key].contactId !== oldLead[key].contactId
        ) {
          const oldContactName =
            decrypt(oldLead[key].firstName) +
            " " +
            decrypt(oldLead[key].lastName);
          const updatedContactName =
            decrypt(updatedLead[key].firstName) +
            " " +
            decrypt(updatedLead[key].lastName);
          description += `${key} ${oldContactName} --> ${updatedContactName} `;
        }
      } else if (`${key}` === "company") {
        const oldCompany = oldLead[key];
        const updatedCompany = updatedLead[key];

        if (!oldCompany && updatedCompany) {
          description += `null --> ${decrypt(updatedCompany.accountName)}`;
        } else if (oldCompany && !updatedCompany) {
          description += `${decrypt(oldCompany.accountName)} --> null`;
        } else if (
          oldCompany != updatedCompany &&
          updatedLead[key].accountId !== oldLead[key].accountId
        ) {
          const oldCompanyName = decrypt(oldLead[key].accountName);
          const updatedCompanyName = decrypt(updatedLead[key].accountName);
          description += `${key} ${oldCompanyName} --> ${updatedCompanyName} `;
        }
      } else if (`${key}` === "owner") {
        if (updatedLead[key].userId !== oldLead[key].userId) {
          const oldOwnerName =
            decrypt(oldLead[key].firstName) +
            " " +
            decrypt(oldLead[key].lastName);
          const updatedOwnerName =
            decrypt(updatedLead[key].firstName) +
            " " +
            decrypt(updatedLead[key].lastName);
          description += `${key} ${oldOwnerName} --> ${updatedOwnerName} `;
        }
      } else if (updatedLead[key] !== oldLead[key]) {
        if (
          `${key}` !== "owner" &&
          `${key}` !== "company" &&
          `${key}` !== "contact" &&
          `${key}` !== "modifiedBy" &&
          `${key}` !== "organization"
        ) {
          if (keywords.includes(key)) {
            description +=
              key +
              " " +
              (oldLead[key] !== null ? decrypt(oldLead[key]) : "null") +
              " --> " +
              (updatedLead[key] !== null ? decrypt(updatedLead[key]) : "null") +
              " ";
          } else {
            description += `${key} ${oldLead[key]} --> ${updatedLead[key]} `;
          }
        }
      }
    }

    const title = decrypt(oldleadRecord.title);

    if (!predescription)
      description = `${title} lead changed from ${description}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.UPDATED,
      lead: oldleadRecord,
      owner: oldleadRecord.owner,
      modifiedBy: modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.insert(auditInstance);
  }

  async deleteAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldleadRecord: Lead,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const title = decrypt(oldleadRecord.title);
    const description = `Lead has been deleted with title ${title}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.DELETED,
      lead: oldleadRecord,
      owner: oldleadRecord.owner,
      modifiedBy: oldleadRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async createLead(
    payload: Lead,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    if (payload.company) {
      const account = await transactionEntityManager
        .getRepository(Account)
        .createQueryBuilder("Account")
        .where("Account.accountName = :accountName", {
          accountName: encryption(String(payload.company)),
        })
        .getOne();
      if (account) payload.company = account;
    }

    payload.leadId = await this.getLeadId(new Date());
    console.log(payload.leadId);

    const userRepo = AppDataSource.getRepository(User);
    const userData = await userRepo.findOne({ where: { userId: user.userId } });
    if (userData) {
      payload.owner = userData as User;
    }

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    if (payload.contact) {
      const contact = await transactionEntityManager
        .getRepository(Contact)
        .createQueryBuilder("contact")
        .where("contact.contactId = :contactId", {
          contactId: String(payload.contact),
        })
        .getOne();
      if (contact) payload.contact = contact;
    }

    const leadRepository: Repository<Lead> =
      transactionEntityManager.getRepository(Lead);
    const leadInstance = new Lead(payload);
    const lead = await leadInstance.save();
    // console.log('lead',lead);

    const auditId = String(user.auth_time) + user.userId;
    await this.createAuditLogHandler(transactionEntityManager, lead, auditId);

    return lead;
  }
  async getleads(
    userId: string,
    _role: Role[],
    search: string | undefined,
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    rating: string[] | undefined,
    status: string[] | undefined,
    leadSource: string[] | undefined,
    page: number = 1,
    limit: number = 7,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    contact: string | undefined,
    company: string | undefined,
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

      const leadSourceArray: string[] = [];
      if (leadSource) {
        for (let i = 0; i < leadSource.length; i++) {
          leadSourceArray.push(encryption(leadSource[i]));
        }
      }

      let leadRepo;
      // if(role.length === 1 && role[0].roleName===roleNames.SALESPERSON){
      if (view == "myView" || view === "null") {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.ownerId=:userId", { userId: userId })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      } else {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      }

      if (country && country.length > 0) {
        leadRepo.andWhere("lead.country IN (:country)", {
          country: countryArray,
        });
      }

      if (rating && rating.length > 0) {
        leadRepo.andWhere("lead.rating IN (:rating)", { rating });
      }

      if (status && status.length > 0) {
        leadRepo.andWhere("lead.status IN (:status)", { status });
      }

      if (leadSource && leadSource.length > 0) {
        leadRepo.andWhere("lead.leadSource IN (:leadSource)", {
          leadSource: leadSourceArray,
        });
      }

      if (createdAt != undefined) {
        leadRepo.orderBy(
          "lead.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        leadRepo.orderBy(
          "lead.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          leadRepo.andWhere(
            "DATE(lead.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const leads = await leadRepo.getMany();
      let accountName: string | undefined = "";
      // let searchedData:LeadSchemaType[]=[]
      let searchedData: Lead[] = [];

      leads.map((lead) => {
        accountName = lead?.company?.accountName;
        if (accountName) {
          accountName = decrypt(accountName);
        }
      });

      for (let lead of leads) {
        lead = await leadDecryption(lead);
        lead.company = await accountDecryption(lead.company as Account);
        lead.contact = await contactDecryption(lead.contact as Contact);
        lead.owner = await userDecryption(lead.owner as User);
        console.log("lead", lead.owner);
      }

      let skip = 0;
      if (search) {
        skip = 1;
        searchedData = await leads.filter((lead) => {
          if (
            (lead?.firstName &&
              lead?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.lastName &&
              lead?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.countryCode &&
              lead?.countryCode
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.phone &&
              lead?.phone
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.title &&
              lead?.title
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.email &&
              lead?.email
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.country &&
              lead?.country
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.state &&
              lead?.state
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.city &&
              lead?.city
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.leadSource &&
              lead?.leadSource
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.rating &&
              lead?.rating
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.currency &&
              lead?.currency
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.status &&
              lead?.status
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.company?.accountName &&
              lead?.company?.accountName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.firstName &&
              lead?.contact?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.lastName &&
              lead?.contact?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.firstName &&
              lead?.owner?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.lastName &&
              lead?.owner?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.description &&
              lead?.description
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.price &&
              lead?.price
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase()))
          ) {
            return true;
          }
        });
      }

      if (state || city || contact || company) {
        let firstName = "";
        let lastName = "";
        if (contact) {
          const nameParts: string[] = contact.split(" ");
          firstName = nameParts[0];
          lastName = nameParts[1];
        }
        skip = 1;
        searchedData = await leads.filter((lead) => {
          const matchState =
            !state || lead.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || lead.city?.toLowerCase().includes(city?.toLowerCase());
          const matchContact =
            !contact ||
            lead.contact?.firstName
              ?.toLowerCase()
              .includes(firstName?.toLowerCase()) ||
            lead.contact?.lastName
              ?.toLowerCase()
              .includes(lastName?.toLowerCase());
          const matchCompany =
            !company ||
            lead.company?.accountName
              ?.toLowerCase()
              .includes(company?.toLowerCase());
          return matchState && matchCity && matchContact && matchCompany;
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = leads;
      }
      const total = searchedData.length;
      searchedData = searchedData.slice((page - 1) * limit, page * limit);
      const pagination = {
        total,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async updateLead(
    leadId: string,
    payload: Lead,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    const leadRepository = transactionEntityManager.getRepository(Lead);
    const lead = await leadRepository.findOne({ where: { leadId: leadId } });
    if (!lead) {
      throw new ResourceNotFoundError("Lead not found");
    }
    // console.log(lead.owner.userId, user.userId);

    payload.modifiedBy = user.email;
    // console.log('2nd log.');

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
      else {
        throw new ResourceNotFoundError("Organization not found");
      }
    }
    // console.log('3rd log.');

    const userRepo = AppDataSource.getRepository(User);
    const userObj: User = payload.owner;
    if (payload.owner) {
      const userData = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.organisation", "organisation")
        .where({
          userId: userObj.userId,
        })
        .andWhere({ organisation: user.organizationId })
        .getOne();
      if (userData) {
        payload.owner = userData as User;
      } else {
        throw new ResourceNotFoundError("User not found in this organization.");
      }
    }

    if (payload.company) {
      const account = await transactionEntityManager
        .getRepository(Account)
        .createQueryBuilder("Account")
        .where("Account.accountId = :accountId", {
          accountId: String(payload.company),
        })
        .getOne();

      if (account) payload.company = account;
    }

    if (payload.contact) {
      const contact = await transactionEntityManager
        .getRepository(Contact)
        .createQueryBuilder("contact")
        .where("contact.contactId = :contactId", {
          contactId: String(payload.contact),
        })
        .getOne();
      if (contact) payload.contact = contact;
    }
    const leadEntity = new Lead(payload);
    const update = await leadRepository.update(leadId, leadEntity);
    const auditId = String(user.auth_time) + user.userId;
    await this.updateAuditLogHandler(
      transactionEntityManager,
      lead,
      leadEntity,
      payload.modifiedBy,
      auditId
    );

    return update;
  }

  async getLead(leadId: string) {
    try {
      const lead = await AppDataSource.getRepository(Lead).findOne({
        // relations: ['company', 'contact'], due to eager : true
        where: {
          leadId: leadId,
        },
      });

      if (!lead) {
        throw new ResourceNotFoundError("Lead not found");
      }

      if (lead?.firstName) lead.firstName = decrypt(lead.firstName);
      if (lead?.lastName) lead.lastName = decrypt(lead.lastName);
      if (lead?.phone) lead.phone = decrypt(lead.phone);
      if (lead?.country) lead.country = decrypt(lead.country);
      if (lead?.state) lead.state = decrypt(lead.state);
      if (lead?.city) lead.city = decrypt(lead.city);
      if (lead?.email) lead.email = decrypt(lead.email);
      if (lead?.title) lead.title = decrypt(lead.title);
      if (lead?.leadSource) lead.leadSource = decrypt(lead.leadSource);
      if (lead?.description) lead.description = decrypt(lead.description);
      if (lead?.countryCode) lead.countryCode = decrypt(lead.countryCode);
      if (lead?.price) lead.price = decrypt(lead.price);

      if (lead.company) {
        lead.company = await accountDecryption(lead.company);
      }
      if (lead.contact) {
        lead.contact = await contactDecryption(lead.contact);
      }
      if (lead?.owner) {
        lead.owner = await userDecryption(lead.owner);
        lead.owner.organisation = await orgnizationDecryption(
          lead.owner.organisation
        );
      }
      if (lead?.organization) {
        lead.organization = await orgnizationDecryption(lead.organization);
      }
      return lead;
    } catch (error) {
      return;
    }
  }
  async deleteLead(
    leadId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    try {
      const leadRepository = transactionEntityManager.getRepository(Lead);
      const lead = await leadRepository.findOne({ where: { leadId: leadId } });
      if (!lead) {
        throw new Error("Lead does not exist");
      }
      await AppDataSource.getRepository(Lead).softDelete(leadId);
      const auditId = String(user.auth_time) + user.userId;
      await leadRepository.update(leadId, { modifiedBy: user.email });
      const leadData = await leadRepository.findOne({
        withDeleted: true, // Include soft-deleted entities
        where: { leadId: leadId },
      });
      if (leadData) {
        await this.deleteAuditLogHandler(
          transactionEntityManager,
          leadData,
          auditId
        );
      }

      return lead;
    } catch (error) {
      throw new Error("Lead does not exist");
    }
  }
  async isLeadExistsByIdToBulkdelete(
    transactionEntityManager: EntityManager,
    leadIds: Array<string>
  ) {
    const leadRepository = transactionEntityManager.getRepository(Lead);
    const leadCanNotBeDeleted: Array<string> = [];
    const leadCanBeDelete: Array<string> = [];
    for (const leadId of leadIds) {
      const lead = await leadRepository.findOne({
        where: {
          leadId: leadId,
        },
      });
      if (lead) {
        leadCanBeDelete.push(leadId);
      } else {
        leadCanNotBeDeleted.push(leadId);
      }
    }
    return { leadCanBeDelete, leadCanNotBeDeleted };
  }
  async bulkDeleteLead(
    leadIds: Array<string>,
    userId: string,
    auth_time: number,
    email: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const auditId = String(auth_time) + userId;
      const leadRepository = await transactionEntityManager.getRepository(Lead);
      const { leadCanBeDelete, leadCanNotBeDeleted } =
        await this.isLeadExistsByIdToBulkdelete(
          transactionEntityManager,
          leadIds
        );
      for (const leadId of leadCanBeDelete) {
        await leadRepository.softDelete(leadId);
        await leadRepository.update(leadId, { modifiedBy: email });
        const leadData = await leadRepository.findOne({
          withDeleted: true, // Include soft-deleted entities
          where: { leadId: leadId },
        });
        if (leadData) {
          await this.deleteAuditLogHandler(
            transactionEntityManager,
            leadData,
            auditId
          );
        }
      }
      return { deleted: leadCanBeDelete, leadsNotFound: leadCanNotBeDeleted };
    } catch (error) {
      return;
    }
  }
  async uploadLeadUsingExcel(
    file: any,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const leads: Lead[] = [];

      // Read the .xlsx file
      const workbook = XLSX.read(file.buffer, { type: "buffer" });

      // Assuming the leads are in the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the sheet to JSON
      const rows = XLSX.utils.sheet_to_json<Lead>(worksheet);

      // Define the expected columns
      const expectedColumns = [
        "country",
        "state",
        "city",
        "leadSource",
        "rating",
        "status",
        "price",
        "title",
        "currency",
        "description",
      ];

      // Check if the first row (columns) match the expected columns
      if (rows.length > 0) {
        const actualColumns = Object.keys(rows[0]);

        // Validate column headings
        const isValid = expectedColumns.every((col) =>
          actualColumns.includes(col)
        );
        console.log("isValid is : ", isValid);

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
        if (row.firstName && row.lastName && row.phone) {
          row.countryCode = `+${row.countryCode}`;
          row.phone = `${row.phone}`;
          row.price = `${row.price}`;
          leads.push(row);
        }
      }

      /*
            const stream = Readable.from(file.buffer.toString());            
            await new Promise<void>((resolve, reject) => {
                stream.pipe(csv())
                    .on("data", (row: any) => {
                        if (row.firstName && row.lastName && row.phone && row.email) {                                                                                   
                            row.countryCode = `+${row.countryCode}`                            
                            leads.push({
                                ...row,                                
                            });
                        }
                    })
                    .on("end", () => {
                        resolve();
                    })
                    .on("error", (error: any) => {
                        reject(error);
                    });
            });*/

      return this.uploadleadsExcel(
        leads,
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
  async uploadleadsExcel(
    leadsArr: Array<Lead>,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    let totalCount = 0;
    let SuccessCount = 0;
    let errorCount = 0;
    try {
      const leadRepository = await transactionEntityManager.getRepository(Lead);
      const accountRepository = await transactionEntityManager.getRepository(
        Account
      );
      const organizationRepo = await AppDataSource.getRepository(Organisation);
      const userdata = await transactionEntityManager
        .getRepository(User)
        .createQueryBuilder("User")
        .where("User.userId = :userId", { userId: user.userId })
        .getOne();

      const uniqueLeads = new Set<string>();
      const leads: Lead[] = [];
      let duplicates: number = 0;

      for (const lead of leadsArr) {
        const leadString = JSON.stringify(lead);
        if (!uniqueLeads.has(leadString)) {
          uniqueLeads.add(leadString);
          leads.push(lead);
        } else {
          duplicates++;
        }
      }

      const arrayLead: Array<Lead> = [];
      let count = 0;
      totalCount = leads.length;
      await Promise.all(
        leads.map(async (lead) => {
          if (lead.company) {
            const account = await accountRepository.findOne({
              where: { accountName: encryption(String(lead.company)) },
            });
            if (!account) return;
            lead.company = account;
          }

          if (userdata) {
            lead.owner = userdata;
          }

          if (user.organizationId) {
            const orgnizationData = await organizationRepo.findOne({
              where: { organisationId: user.organizationId },
            });
            if (orgnizationData) lead.organization = orgnizationData;
          }

          let leadId = await this.getLeadId(new Date());
          lead.leadId =
            leadId.slice(0, -1) +
            (Number(leadId.slice(-1)) + count++).toString();

          if (lead.firstName) lead.firstName = encryption(lead.firstName);
          if (lead.lastName) lead.lastName = encryption(lead.lastName);
          if (lead.phone) lead.phone = encryption(lead.phone);
          if (lead.country) lead.country = encryption(lead.country);
          if (lead.leadSource) lead.leadSource = encryption(lead.leadSource);
          if (lead.email) lead.email = encryption(lead.email);
          if (lead.state) lead.state = encryption(lead.state);
          if (lead.city) lead.city = encryption(lead.city);
          if (lead.title) lead.title = encryption(lead.title);
          if (lead.description) lead.description = encryption(lead.description);
          if (lead.price) lead.price = encryption(lead.price);
          if (lead.countryCode) lead.countryCode = encryption(lead.countryCode);

          SuccessCount++;
          arrayLead.push(lead);
        })
      );

      await leadRepository.save(arrayLead);
    } catch (error) {
      errorCount = totalCount - SuccessCount;
    }

    const leadDataSummery = {
      totalCount: totalCount,
      SuccessCount: SuccessCount,
      errorCount: errorCount,
      filename: filename,
    };

    return leadDataSummery;
  }

  async getLeadsByContactId(
    userId: string,
    _role: Role[],
    search: string | undefined,
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    rating: string[] | undefined,
    status: string[] | undefined,
    leadSource: string[] | undefined,
    page: number = 1,
    limit: number = 7,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    contact: string | undefined,
    company: string | undefined,
    contactId: string | undefined,
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

      const leadSourceArray: string[] = [];
      if (leadSource) {
        for (let i = 0; i < leadSource.length; i++) {
          leadSourceArray.push(encryption(leadSource[i]));
        }
      }

      let leadRepo;
      if (view == "myView" || view === "null") {
        // if(role.length === 1 && role[0].roleName===roleNames.SALESPERSON){
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.ownerId=:userId", { userId: userId })
          .andWhere("lead.contactContactId=:contactId", {
            contactId: contactId,
          })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      } else {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.contactContactId=:contactId", { contactId: contactId })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      }

      if (country && country.length > 0) {
        leadRepo.andWhere("lead.country IN (:country)", {
          country: countryArray,
        });
      }

      if (rating && rating.length > 0) {
        leadRepo.andWhere("lead.rating IN (:rating)", { rating });
      }

      if (status && status.length > 0) {
        leadRepo.andWhere("lead.status IN (:status)", { status });
      }

      if (leadSource && leadSource.length > 0) {
        leadRepo.andWhere("lead.leadSource IN (:leadSource)", {
          leadSource: leadSourceArray,
        });
      }

      if (createdAt != undefined) {
        leadRepo.orderBy(
          "lead.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        leadRepo.orderBy(
          "lead.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          leadRepo.andWhere(
            "DATE(lead.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const leads = await leadRepo.getMany();

      let accountName: string | undefined = "";
      // let searchedData:LeadSchemaType[]=[]
      let searchedData: Lead[] = [];

      leads.map((lead) => {
        accountName = lead?.company?.accountName;
        if (accountName) {
          accountName = decrypt(accountName);
        }
      });

      for (let lead of leads) {
        lead = await leadDecryption(lead);
        lead.company = await accountDecryption(lead.company as Account);
        lead.contact = await contactDecryption(lead.contact as Contact);
        lead.owner = await userDecryption(lead.owner as User);
      }

      let skip = 0;
      if (search) {
        skip = 1;
        searchedData = await leads.filter((lead) => {
          if (
            (lead?.firstName &&
              lead?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.lastName &&
              lead?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.countryCode &&
              lead?.countryCode
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.phone &&
              lead?.phone
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.title &&
              lead?.title
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.email &&
              lead?.email
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.country &&
              lead?.country
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.state &&
              lead?.state
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.city &&
              lead?.city
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.leadSource &&
              lead?.leadSource
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.rating &&
              lead?.rating
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.currency &&
              lead?.currency
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.status &&
              lead?.status
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.company?.accountName &&
              lead?.company?.accountName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.firstName &&
              lead?.contact?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.lastName &&
              lead?.contact?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.firstName &&
              lead?.owner?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.lastName &&
              lead?.owner?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.description &&
              lead?.description
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.price &&
              lead?.price
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase()))
          ) {
            return true;
          }
        });
      }

      if (state || city || contact || company) {
        let firstName = "";
        let lastName = "";
        if (contact) {
          const nameParts: string[] = contact.split(" ");
          firstName = nameParts[0];
          lastName = nameParts[1];
        }
        skip = 1;
        searchedData = await leads.filter((lead) => {
          const matchState =
            !state || lead.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || lead.city?.toLowerCase().includes(city?.toLowerCase());
          const matchContact =
            !contact ||
            lead.contact?.firstName
              ?.toLowerCase()
              .includes(firstName?.toLowerCase()) ||
            lead.contact?.lastName
              ?.toLowerCase()
              .includes(lastName?.toLowerCase());
          const matchCompany =
            !company ||
            lead.company?.accountName
              ?.toLowerCase()
              .includes(company?.toLowerCase());
          return matchState && matchCity && matchContact && matchCompany;
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = leads;
      }
      const total = searchedData.length;
      searchedData = searchedData.slice((page - 1) * limit, page * limit);
      const pagination = {
        total,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async getLeadsByAccountId(
    userId: string,
    _role: Role[],
    search: string | undefined,
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    rating: string[] | undefined,
    status: string[] | undefined,
    leadSource: string[] | undefined,
    page: number = 1,
    limit: number = 7,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    contact: string | undefined,
    company: string | undefined,
    accountId: string | undefined,
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

      const leadSourceArray: string[] = [];
      if (leadSource) {
        for (let i = 0; i < leadSource.length; i++) {
          leadSourceArray.push(encryption(leadSource[i]));
        }
      }

      let leadRepo;
      if (view == "myView" || view === "null") {
        // if(role.length === 1 && role[0].roleName===roleNames.SALESPERSON){
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.ownerId=:userId", { userId: userId })
          .andWhere("lead.companyAccountId=:accountId", {
            accountId: accountId,
          })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      } else {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.companyAccountId=:accountId", { accountId: accountId })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("lead.updatedAt", "DESC");
      }

      if (country && country.length > 0) {
        leadRepo.andWhere("lead.country IN (:country)", {
          country: countryArray,
        });
      }

      if (rating && rating.length > 0) {
        leadRepo.andWhere("lead.rating IN (:rating)", { rating });
      }

      if (status && status.length > 0) {
        leadRepo.andWhere("lead.status IN (:status)", { status });
      }

      if (leadSource && leadSource.length > 0) {
        leadRepo.andWhere("lead.leadSource IN (:leadSource)", {
          leadSource: leadSourceArray,
        });
      }

      if (createdAt != undefined) {
        leadRepo.orderBy(
          "lead.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        leadRepo.orderBy(
          "lead.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          leadRepo.andWhere(
            "DATE(lead.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const leads = await leadRepo.getMany();

      let accountName: string | undefined = "";
      // let searchedData:LeadSchemaType[]=[]
      let searchedData: Lead[] = [];

      leads.map((lead) => {
        accountName = lead?.company?.accountName;
        if (accountName) {
          accountName = decrypt(accountName);
        }
      });

      for (let lead of leads) {
        lead = await leadDecryption(lead);
        lead.company = await accountDecryption(lead.company as Account);
        lead.contact = await contactDecryption(lead.contact as Contact);
        lead.owner = await userDecryption(lead.owner as User);
      }

      let skip = 0;
      if (search) {
        skip = 1;
        searchedData = await leads.filter((lead) => {
          if (
            (lead?.firstName &&
              lead?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.lastName &&
              lead?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.countryCode &&
              lead?.countryCode
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.phone &&
              lead?.phone
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.title &&
              lead?.title
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.email &&
              lead?.email
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.country &&
              lead?.country
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.state &&
              lead?.state
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.city &&
              lead?.city
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.leadSource &&
              lead?.leadSource
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.rating &&
              lead?.rating
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.currency &&
              lead?.currency
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.status &&
              lead?.status
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.company?.accountName &&
              lead?.company?.accountName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.firstName &&
              lead?.contact?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.contact?.lastName &&
              lead?.contact?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.firstName &&
              lead?.owner?.firstName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.owner?.lastName &&
              lead?.owner?.lastName
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.description &&
              lead?.description
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase())) ||
            (lead?.price &&
              lead?.price
                ?.toString()
                .toLowerCase()
                .includes(String(search).toLowerCase()))
          ) {
            return true;
          }
        });
      }

      if (state || city || contact || company) {
        let firstName = "";
        let lastName = "";
        if (contact) {
          const nameParts: string[] = contact.split(" ");
          firstName = nameParts[0];
          lastName = nameParts[1];
        }
        skip = 1;
        searchedData = await leads.filter((lead) => {
          const matchState =
            !state || lead.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || lead.city?.toLowerCase().includes(city?.toLowerCase());
          const matchContact =
            !contact ||
            lead.contact?.firstName
              ?.toLowerCase()
              .includes(firstName?.toLowerCase()) ||
            lead.contact?.lastName
              ?.toLowerCase()
              .includes(lastName?.toLowerCase());
          const matchCompany =
            !company ||
            lead.company?.accountName
              ?.toLowerCase()
              .includes(company?.toLowerCase());
          return matchState && matchCity && matchContact && matchCompany;
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = leads;
      }
      const total = searchedData.length;
      searchedData = searchedData.slice((page - 1) * limit, page * limit);
      const pagination = {
        total,
        page: page,
        limit: limit,
        data: searchedData,
      };
      return pagination;
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async assignLeadsByTitle(
    leadTitle: string,
    userId: string,
    currentUser: any,
    transactionEntityManager: EntityManager
  ) {
    try {
      // First verify both the lead title and user exist
      const userExists = await transactionEntityManager.findOne(User, {
        where: { userId: userId }
      });

      if (!userExists) {
        throw new Error("User not found");
      }

      // Encrypt the title for search if encryption is used in the system
      const encryptedTitle = encryption(leadTitle);

      // Update all leads with matching title
      const result = await transactionEntityManager
        .createQueryBuilder()
        .update(Lead)
        .set({
          owner: { userId: userId },
          modifiedBy: currentUser.userId,
          updatedAt: new Date()
        })
        .where("title = :title", { title: leadTitle })
        .andWhere("deletedAt IS NULL")
        .execute();

      return result;
    } catch (error) {
      console.error("Error assigning leads by title:", error);
      throw error;
    }
  }
}
export default LeadService;
