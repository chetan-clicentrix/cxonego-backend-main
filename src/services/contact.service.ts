import { Contact } from "../entity/Contact";
import { AppDataSource } from "../data-source";
import logger from "../common/logger";
import { UpdateResult, EntityManager, Repository } from "typeorm";
import { Account } from "../entity/Account";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
// import { Readable } from "stream";
import {
  auditType,
  encryption,
  roleNames,
  status,
  decrypt,
  favourite,
} from "../common/utils";
import { Lead } from "../entity/Lead";
import {
  accountDecryption,
  contactDecryption,
  multipleleadsDecryption,
  orgnizationDecryption,
  userDecryption,
} from "./decryption.service";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { User } from "../entity/User";
import { Audit } from "../entity/Audit";
import { userInfo } from "../interfaces/types";
import { v4 } from "uuid";
import { Organisation } from "../entity/Organisation";
// import * as csv from "csv-parser";
import * as XLSX from "xlsx";
// import * as fs from "fs";
class ContactServices {
  async getAllContacts(userInfo: userInfo) {
    const contacts = await AppDataSource.getRepository(Contact)
      .createQueryBuilder("contact")
      .leftJoinAndSelect("contact.owner", "user")
      .leftJoinAndSelect("contact.organization", "organisation")
      .where("organisation.organisationId = :organisationId", {
        organisationId: userInfo.organizationId,
      })
      .select(["contact", "user.userId", "user.firstName", "user.lastName"])
      .orderBy("contact.updatedAt", "DESC")
      .getMany();

    for (let contact of contacts) {
      contact = await contactDecryption(contact);
      contact.owner = await userDecryption(contact.owner);
    }
    return contacts;
  }

  async getContacts(
    userId: string,
    _role: Role[],
    search: string | undefined,
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    company: string | undefined,
    industry: string[] | undefined,
    status: string[] | undefined,
    favourite: string[] | undefined,
    contactType: string[] | undefined,
    page: number,
    limit: number,
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

      let contactRepo;
      // if(role.length===1 && role[0].roleName===roleNames.SALESPERSON){
      if (view == "myView" || view === "null") {
        contactRepo = AppDataSource.getRepository(Contact)
          .createQueryBuilder("contact")
          .select()
          .leftJoinAndSelect("contact.company", "account")
          .leftJoinAndSelect("contact.leads", "lead")
          .leftJoinAndSelect("contact.owner", "user")
          .where("contact.ownerId=:userId", { userId: userId })
          .andWhere("contact.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("contact.updatedAt", "DESC");
      } else {
        contactRepo = AppDataSource.getRepository(Contact)
          .createQueryBuilder("contact")
          .select()
          .leftJoinAndSelect("contact.company", "account")
          .leftJoinAndSelect("contact.leads", "lead")
          .leftJoinAndSelect("contact.owner", "user")
          .where("contact.organizationId=:organizationId", {
            organizationId: organizationId,
          })
          .orderBy("contact.updatedAt", "DESC");
      }

      if (country && country.length > 0) {
        contactRepo.andWhere("contact.country IN (:country)", {
          country: countryArray,
        });
      }

      if (industry && industry.length > 0) {
        contactRepo.andWhere("contact.industry IN (:industry)", {
          industry: industryArray,
        });
      }

      if (status && status.length > 0) {
        contactRepo.andWhere("contact.status IN (:status)", { status });
      }

      if (favourite && favourite.length > 0) {
        contactRepo.andWhere("contact.favourite IN (:favourite)", {
          favourite,
        });
      }

      if (contactType && contactType.length > 0) {
        contactRepo.andWhere("contact.contactType IN (:contactType)", {
          contactType,
        });
      }

      if (createdAt != undefined) {
        contactRepo.orderBy(
          "contact.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        contactRepo.orderBy(
          "contact.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          contactRepo.andWhere(
            "DATE(contact.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const contacts = await contactRepo.getMany();
      if (contacts.length > 0) {
        for (let contact of contacts) {
          contact = await contactDecryption(contact);
          contact.leads = await multipleleadsDecryption(contact.leads);
          contact.company = await accountDecryption(contact.company as Account);
          contact.owner = await userDecryption(contact.owner as User);
        }
      }

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
            contact?.phone
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.email
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.addressLine
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.area
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.country
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.state
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.city
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.industry
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.designation
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.description
              ?.toLowerCase()
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
            contact?.owner?.firstName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.owner?.lastName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.company?.accountName
              ?.toLowerCase()
              .includes(String(search)?.toLowerCase())
          ) {
            return true;
          }
          return false;
        });
      }

      if (state || city || company) {
        skip = 1;
        searchedData = await contacts.filter((contact) => {
          const matchState =
            !state ||
            contact?.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || contact?.city?.toLowerCase().includes(city?.toLowerCase());
          const matchcompany =
            !company ||
            contact.company?.accountName
              ?.toLowerCase()
              .includes(company?.toLowerCase());
          return matchState && matchCity && matchcompany;
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = contacts;
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
      return;
    }
  }

  async bulkDelete(payload: string[]) {
    try {
      const contact: UpdateResult = await AppDataSource.getRepository(
        Contact
      ).softDelete(payload);
      if (contact.affected === 0) {
        return false;
      }
      return true;
    } catch (error) {
      return;
    }
  }

  async getContact(contactId: string) {
    try {
      let contact = await AppDataSource.getRepository(Contact)
        .createQueryBuilder("contact")
        .select()
        .leftJoinAndSelect("contact.company", "account")
        .leftJoinAndSelect("contact.owner", "user")
        .where({ contactId: contactId })
        .getOne();

      if (contact) {
        contact = await contactDecryption(contact);

        if (contact.company) {
          contact.company = await accountDecryption(
            contact?.company as Account
          );
        }

        if (contact.owner) {
          contact.owner = await userDecryption(contact?.owner as User);
        }
      }
      return contact;
    } catch (error) {
      return;
    }
  }

  async getContactId(date: Date) {
    const month = String(
      date.getMonth() + 1 >= 10
        ? date.getMonth() + 1
        : "0" + (date.getMonth() + 1)
    );
    const year = String(date.getFullYear().toString()?.slice(-2));

    const lastContact = await AppDataSource.getRepository(Contact)
      .createQueryBuilder("ContactEntity")
      .withDeleted()
      .select()
      .orderBy("ContactEntity.createdAt", "DESC")
      .getOne();
    let contactNo = "00";
    const yearFromRecord = String(lastContact?.contactIdForUsers?.slice(3, 5)); //C032409,
    const contactIdFromRecord = String(
      lastContact?.contactIdForUsers?.substring(5)
    );

    if (year === yearFromRecord) {
      contactNo = contactIdFromRecord;
    }
    const contactId =
      "C" + month + year + "0" + (Number(contactNo) + 1).toString();

    return contactId;
  }

  async createContact(
    payload: Contact,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    let contactRepository = await AppDataSource.getRepository(Contact)
      .createQueryBuilder("Contact")
      .select()
      .where("Contact.phone=:phone", { phone: encryption(payload.phone) })
      .andWhere("Contact.organizationId=:organizationId", {
        organizationId: user.organizationId,
      });

    const contact = await contactRepository.getOne();

    if (contact) {
      throw new Error("This contact is allready use");
    }

    //a value generated by v4() function.assign to contactId
    payload.contactIdForUsers = await this.getContactId(new Date());

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

    if (payload?.company) {
      const company = (await transactionEntityManager
        .getRepository(Account)
        .findOne({ where: { accountId: String(payload.company) } })) as Account;
      payload.company = company;
    }

    const leads: Lead[] = [];
    if (payload.leads) {
      payload.leads.forEach(async (lead) => {
        const leadInstance = await transactionEntityManager
          .getRepository(Lead)
          .findOne({
            where: {
              leadId: String(lead),
            },
          });
        if (leadInstance) leads.push(leadInstance);
      });
      payload.leads = leads;
    }

    let contactInstance = new Contact(payload);
    const contactObj = await contactInstance.save();

    const auditId = String(user.auth_time) + user.userId;
    await this.createAuditLogHandler(
      transactionEntityManager,
      contactObj,
      auditId
    );
    return contactObj;
  }

  async updateContact(
    payload: Contact,
    contactId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    const contactRepository = transactionEntityManager.getRepository(Contact);
    const contact = await contactRepository.findOne({
      where: { contactId: contactId },
      relations: ["company"],
    });

    if (!contact) {
      throw new ResourceNotFoundError("Contact not found");
    }

    payload.modifiedBy = user.email;

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    const userRepo = AppDataSource.getRepository(User);
    const userObj: User = payload.owner; //this user object is coming from frontend so it is not encrypted
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
      const company = (await transactionEntityManager
        .getRepository("Account")
        .findOne({
          where: { accountId: payload.company },
        })) as Account;

      if (!company) {
        throw new ResourceNotFoundError("Company not found");
      }
      payload.company = company;
    }

    const leads: Lead[] = [];
    if (payload.leads) {
      payload.leads.forEach(async (lead) => {
        const leadInstance = await transactionEntityManager
          .getRepository(Lead)
          .findOne({
            where: {
              leadId: String(lead),
            },
          });
        if (leadInstance) leads.push(leadInstance);
      });
      payload.leads = leads;
    }

    const contactEntity = new Contact(payload);
    const update = await contactRepository.update(contactId, contactEntity);

    const auditId = String(user.auth_time) + user.userId;
    await this.updateAuditLogHandler(
      transactionEntityManager,
      contact,
      contactEntity,
      payload.modifiedBy,
      auditId
    );

    return update;
  }

  async deleteContact(
    contactId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    try {
      const contactRepository = transactionEntityManager.getRepository(Contact);
      const contact = await contactRepository.findOneBy({
        contactId: contactId,
      });
      if (!contact) {
        throw new Error("Contact does not exist");
      }

      await AppDataSource.getRepository(Contact).softDelete(contactId);
      const auditId = String(user.auth_time) + user.userId;
      await contactRepository.update(contactId, { modifiedBy: user.email });
      const contactData = await contactRepository.findOne({
        withDeleted: true, // Include soft-deleted entities
        where: { contactId: contactId },
      });
      if (contactData) {
        await this.deleteAuditLogHandler(
          transactionEntityManager,
          contactData,
          auditId
        );
      }

      return contact;
    } catch (error) {
      throw new Error("Contact does not exist");
    }
  }

  async partiallyUpdateContact(
    contactId: string,
    payload: Contact
  ): Promise<UpdateResult> {
    try {
      const contact: UpdateResult = await AppDataSource.getRepository(
        "Contact"
      ).update(contactId, { ...payload });
      return contact;
    } catch (error) {
      return error;
    }
  }

  /*
    async uploadCotactUsingCSV(file:any,user:userInfo,transactionEntityManager:EntityManager){
        try {
            const contacts: Contact[] = [];
            const stream = Readable.from(file.buffer.toString());
            await new Promise<void>((resolve, reject) => {
                stream.pipe(csv())
                    .on("data", (row: any) => {
                        if (row.firstName && row.lastName && row.phone) {
                            row.countryCode = `+${row.countryCode}`   
                            contacts.push({
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
            });
            console.log("contactsssss are  ",contacts);
        return this.uploadCSVContacts(contacts,user,transactionEntityManager);
        } catch (error) {
            throw new Error("Please upload a CSV file and try again");
        }
    }

    */

  async uploadCotactUsingExcel(
    file: any,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const contacts: Contact[] = [];

      // Read the .xlsx file
      const workbook = XLSX.read(file.buffer, { type: "buffer" });

      // Assuming the contacts are in the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the sheet to JSON
      const rows = XLSX.utils.sheet_to_json<Contact>(worksheet);
      // console.log("rows is : ",rows);

      // Define the expected columns
      const expectedColumns = [
        "fullName",
        "countryCode",
        "phone",
        "email",
        "addressLine",
        "area",
        "city",
        "state",
        "country",
        "industry",
        "designation",
        "description",
        "status",
        "favourite",
        "contactType",
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

      for (const row of rows) {
        if (row.fullName) {
          row.countryCode = `+${row.countryCode || ""}`;
          row.phone = `${row.phone || ""}`;
          contacts.push(row);
        }
      }

      return this.uploadExcelContacts(
        contacts,
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

  async uploadExcelContacts(
    contactsArr: Array<Contact>,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const uniqueContacts = new Set<string>();
      const contacts: Contact[] = [];

      // First, from the excel level, avoid duplicate contacts and make an array of them
      for (const contact of contactsArr) {
        const contactString = JSON.stringify(contact);
        if (!uniqueContacts.has(contactString)) {
          uniqueContacts.add(contactString);
          contacts.push(contact);
        }
      }

      const totalCount = contacts.length;
      let SuccessCount = 0;
      let DuplicateCount = 0;
      const duplicateContactData: Array<{
        phone: string;
        fullName: string;
      }> = [];
      let errorCount = 0;

      try {
        const contactRepository = await transactionEntityManager.getRepository(
          Contact
        );
        const accountRepository = await transactionEntityManager.getRepository(
          Account
        );
        const organizationRepo = await transactionEntityManager.getRepository(
          Organisation
        );

        // Get user data
        const userdata = await transactionEntityManager
          .getRepository(User)
          .createQueryBuilder("User")
          .where("User.userId = :userId", { userId: user.userId })
          .getOne();

        const arrayContact: Array<Contact> = [];

        const existingDeletedContacts = await transactionEntityManager
          .getRepository(Contact)
          .createQueryBuilder("Contact")
          .withDeleted() // This method includes soft-deleted rows in the result
          .where("Contact.organizationId = :organizationId", {
            organizationId: user.organizationId,
          })
          .andWhere("Contact.deletedAt IS NOT NULL")
          .getMany();

        const existingNonDeletedContacts = await transactionEntityManager
          .getRepository(Contact)
          .createQueryBuilder("Contact")
          .where("Contact.organizationId = :organizationId", {
            organizationId: user.organizationId,
          })
          .getMany();

        const existingDeletedPhoneNumbers = new Set(
          existingDeletedContacts.map((contact) => decrypt(contact.phone))
        );
        const existingNonDeletedPhoneNumbers = new Set(
          existingNonDeletedContacts.map((contact) => decrypt(contact.phone))
        );

        console.log(
          "existingDeletedPhoneNumbers : ",
          existingDeletedPhoneNumbers
        );
        console.log(
          "existingNonDeletedPhoneNumbers : ",
          existingNonDeletedPhoneNumbers
        );

        let count = 0;
        await Promise.all(
          contacts.map(async (contact) => {
            const decryptedPhone = `${contact.phone}`;

            // New contact, add it to be inserted
            if (contact.company) {
              const account = await accountRepository.findOne({
                where: { accountName: encryption(String(contact.company)) },
              });
              if (!account) return;
              contact.company = account;
            }

            if (userdata) {
              contact.owner = userdata;
            }

            if (user.organizationId) {
              try {
                const orgnizationData = await organizationRepo.findOne({
                  where: { organisationId: user.organizationId },
                });
                // console.log("orgnizationData is::::::::",orgnizationData);
                if (orgnizationData) contact.organization = orgnizationData;
              } catch (error) {
                console.log("ERR is : ", error);
              }
            }

            if (contact.fullName)
              contact.fullName = encryption(contact.fullName);
            if (contact.countryCode)
              contact.countryCode = encryption(contact.countryCode);
            if (contact.phone) contact.phone = encryption(contact.phone);
            if (contact.email) contact.email = encryption(contact.email);
            if (contact.addressLine)
              contact.addressLine = encryption(contact.addressLine);
            if (contact.area) contact.area = encryption(contact.area);
            if (contact.city) contact.city = encryption(contact.city);
            if (contact.state) contact.state = encryption(contact.state);
            if (contact.country) contact.country = encryption(contact.country);
            if (contact.industry)
              contact.industry = encryption(contact.industry);
            if (contact.designation)
              contact.designation = encryption(contact.designation);
            if (contact.description)
              contact.description = encryption(contact.description);
            if (contact.social) contact.social = encryption(contact.social);
            contact.contactId = v4();

            let contactId = await this.getContactId(new Date());
            contact.contactIdForUsers =
              contactId.slice(0, -1) +
              (Number(contactId.slice(-1)) + count++).toString();

            if (existingNonDeletedPhoneNumbers.has(decryptedPhone)) {
              DuplicateCount++;
              duplicateContactData.push({
                phone: decrypt(contact.phone),
                fullName: decrypt(contact.fullName),
              });
            } else {
              if (existingDeletedPhoneNumbers.has(decryptedPhone)) {
                arrayContact.push(contact);
              } else {
                arrayContact.push(contact);
              }

              SuccessCount++;
            }
          })
        );

        await contactRepository.save(arrayContact);
      } catch (error) {
        errorCount = totalCount - SuccessCount - DuplicateCount;
      }

      const contactDataSummary = {
        totalCount: totalCount,
        SuccessCount: SuccessCount,
        errorCount: errorCount,
        DuplicateCount: DuplicateCount,
        filename: filename,
        duplicateContactData: duplicateContactData,
      };

      return contactDataSummary;
    } catch (error) {
      throw new Error("Please upload a correct xlsx file and try again");
    }
  }

  async bulkCreateLeads(
    contacts: Array<Contact>,
    transactionEntityManager: EntityManager
  ) {
    try {
      const contactRepository = transactionEntityManager.getRepository(Contact);
      const accountRepository = transactionEntityManager.getRepository(Account);
      const arrayLead: Array<Contact> = [];
      let count = 0;
      await Promise.all(
        contacts.map(async (contact) => {
          if (contact.company) {
            const account = await accountRepository.findOne({
              where: { accountName: encryption(String(contact.company)) },
            });
            if (!account) return;
            contact.company = account;
          }
          if (contact.fullName)
            contact.fullName = encryption(contact.fullName);
          if (contact.countryCode)
            contact.countryCode = encryption(contact.countryCode);
          if (contact.phone) contact.phone = encryption(contact.phone);
          if (contact.area) contact.area = encryption(contact.area);
          if (contact.city) contact.city = encryption(contact.city);
          if (contact.state) contact.state = encryption(contact.state);
          if (contact.country) contact.country = encryption(contact.country);
          if (contact.email) contact.email = encryption(contact.email);
          if (contact.addressLine)
            contact.addressLine = encryption(contact.addressLine);
          if (contact.industry) contact.industry = encryption(contact.industry);
          if (contact.designation)
            contact.designation = encryption(contact.designation);
          if (contact.description)
            contact.description = encryption(contact.description);
          if (contact.social) contact.social = encryption(contact.social);

          arrayLead.push(contact);
        })
      );

      await contactRepository.save(arrayLead);
      return true;
    } catch (error) {
      throw new Error("something went wrong please try again later");
    }
  }
  async isConsistsOfDuplicateContact(bulkContacts: Array<Contact>) {
    const uniqueContacts = new Set();
    let index = 0;
    let count = 0;
    const unique: Contact[] = [];
    for (const contact of bulkContacts) {
      index++;
      uniqueContacts.add(contact.phone);
      uniqueContacts.size === index ? unique.push(contact) : count++;
    }
    const response = {
      count: count,
      contacts: unique,
    };
    return response;
  }

  async isContactExistsByIdToBulkdelete(
    transactionEntityManager: EntityManager,
    contactIds: Array<string>
  ) {
    try {
      const contactRepository = await transactionEntityManager.getRepository(
        Contact
      );
      const contactCanNotBeDeleted: Array<string> = [];
      const contactCanBeDelete: Array<string> = [];
      for (const contactId of contactIds) {
        const contact = await contactRepository.findOneBy({
          contactId: contactId,
        });
        if (contact) {
          contactCanBeDelete.push(contactId);
        } else {
          contactCanNotBeDeleted.push(contactId);
        }
      }
      return { contactCanBeDelete, contactCanNotBeDeleted };
    } catch (error) {
      console.log("error at 693 : ", error);
      throw error; // Ensure error is propagated to the caller
    }
  }

  async bulkDeleteContact(
    contactIds: Array<string>,
    userId: string,
    auth_time: number,
    email: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const auditId = String(auth_time) + userId;
      const contactRepository = await transactionEntityManager.getRepository(
        Contact
      );
      const { contactCanBeDelete, contactCanNotBeDeleted } =
        await this.isContactExistsByIdToBulkdelete(
          transactionEntityManager,
          contactIds
        );
      for (const contactId of contactCanBeDelete) {
        await contactRepository.softDelete(contactId);
        await contactRepository.update(contactId, { modifiedBy: email });
        const contact = await contactRepository.findOne({
          withDeleted: true, // Include soft-deleted entities
          where: { contactId: contactId },
        });
        if (contact) {
          await this.deleteAuditLogHandler(
            transactionEntityManager,
            contact,
            auditId
          );
        }
      }
      return {
        deleted: contactCanBeDelete,
        contactsNotFound: contactCanNotBeDeleted,
      };
    } catch (error) {
      console.log("error : ", error);
      return;
    }
  }

  async createAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldcontactRecord: Contact,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const fullName = decrypt(oldcontactRecord.fullName);
    const description = `New contact created with name ${fullName} `;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.INSERTED,
      contact: oldcontactRecord,
      owner: oldcontactRecord.owner,
      modifiedBy: oldcontactRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async deleteAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldContactRecord: Contact,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const fullName = decrypt(oldContactRecord.fullName);
    const description = `Contact has been deleted with name ${fullName}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.DELETED,
      contact: oldContactRecord,
      owner: oldContactRecord.owner,
      modifiedBy: oldContactRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async updateAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldContactRecord: Contact,
    updatedContactRecord: Contact,
    modifiedBy: string,
    auditId: string
  ) {
    const updatedContact = Object(updatedContactRecord);
    const oldContact = Object(oldContactRecord);
    console.log("updatedContact", updatedContact);
    console.log("oldContact", oldContact);

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
      "fullName",
      "countryCode",
      "phone",
      "email",
      "addressLine",
      "area",
      "city",
      "state",
      "country",
      "industry",
      "designation",
      "description",
      "social",
      "timeline",
    ];

    for (let key in updatedContact) {
      if (`${key}` === "company") {
        const oldCompany = oldContact[key];
        const updatedCompany = updatedContact[key];
        if (!oldCompany && updatedCompany) {
          description += `null --> ${decrypt(updatedCompany.accountName)}`;
        } else if (oldCompany && !updatedCompany) {
          description += `${decrypt(oldCompany.accountName)} --> null`;
        } else if (
          oldCompany != updatedCompany &&
          updatedCompany.accountId !== oldCompany.accountId
        ) {
          const oldCompanyName = decrypt(oldCompany.accountName);
          const updatedCompanyName = decrypt(updatedCompany.accountName);
          description += `${key} ${oldCompanyName} --> ${updatedCompanyName} `;
        }
      } else if (`${key}` === "owner") {
        if (updatedContact[key].userId !== oldContact[key].userId) {
          const oldOwnerName =
            decrypt(oldContact[key].firstName) +
            " " +
            decrypt(oldContact[key].lastName);
          const updatedOwnerName =
            decrypt(updatedContact[key].firstName) +
            " " +
            decrypt(updatedContact[key].lastName);
          description += `${key} ${oldOwnerName} --> ${updatedOwnerName} `;
        }
      } else if (updatedContact[key] !== oldContact[key]) {
        if (
          `${key}` !== "owner" &&
          `${key}` !== "company" &&
          `${key}` !== "modifiedBy" &&
          `${key}` !== "organization"
        ) {
          if (keywords.includes(key)) {
            description +=
              key +
              " " +
              (oldContact[key] !== null ? decrypt(oldContact[key]) : "null") +
              " --> " +
              (updatedContact[key] !== null
                ? decrypt(updatedContact[key])
                : "null") +
              " ";
          } else {
            description += `${key} ${oldContact[key]} --> ${updatedContact[key]} `;
          }
        }
      }
    }

    const fullName = decrypt(oldContactRecord.fullName);

    if (!predescription)
      description = `${fullName} contact changed from ${description}`;

    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.UPDATED,
      contact: oldContactRecord,
      owner: oldContactRecord.owner,
      modifiedBy: modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.insert(auditInstance);
  }

  async getContactByAccountId(
    _userId: string,
    _role: Role[],
    search: string | undefined,
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    company: string | undefined,
    industry: string[] | undefined,
    status: string[] | undefined,
    favourite: string[] | undefined,
    contactType: string[] | undefined,
    page: number,
    limit: number,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    accountId: string,
    organizationId: string | null
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

      let contactRepo = AppDataSource.getRepository(Contact)
        .createQueryBuilder("contact")
        .select()
        .leftJoinAndSelect("contact.company", "account")
        .leftJoinAndSelect("contact.leads", "lead")
        .leftJoinAndSelect("contact.owner", "user")
        .where("contact.companyAccountId=:accountId", { accountId: accountId })
        .andWhere("contact.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("contact.updatedAt", "DESC");

      if (country && country.length > 0) {
        contactRepo.andWhere("contact.country IN (:country)", {
          country: countryArray,
        });
      }

      if (industry && industry.length > 0) {
        contactRepo.andWhere("contact.industry IN (:industry)", {
          industry: industryArray,
        });
      }

      if (status && status.length > 0) {
        contactRepo.andWhere("contact.status IN (:status)", { status });
      }

      if (favourite && favourite.length > 0) {
        contactRepo.andWhere("contact.favourite IN (:favourite)", {
          favourite,
        });
      }

      if (contactType && contactType.length > 0) {
        contactRepo.andWhere("contact.contactType IN (:contactType)", {
          contactType,
        });
      }

      if (createdAt != undefined) {
        contactRepo.orderBy(
          "contact.createdAt",
          createdAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (updatedAt != undefined) {
        contactRepo.orderBy(
          "contact.updatedAt",
          updatedAt == "DESC" ? "DESC" : "ASC"
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          contactRepo.andWhere(
            "DATE(contact.updatedAt) BETWEEN :startDate AND :endDate",
            {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          );
        }
      }

      const contacts = await contactRepo.getMany();

      if (contacts.length > 0) {
        for (let contact of contacts) {
          contact = await contactDecryption(contact);
          contact.leads = await multipleleadsDecryption(contact.leads);
          contact.company = await accountDecryption(contact.company as Account);
          contact.owner = await userDecryption(contact.owner);
        }
      }

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
            contact?.phone
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.email
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.addressLine
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.area
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.country
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.state
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.city
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.industry
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.designation
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.description
              ?.toLowerCase()
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
            contact?.owner?.firstName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.owner?.lastName
              ?.toLowerCase()
              .includes(String(search).toLowerCase()) ||
            contact?.company?.accountName
              ?.toLowerCase()
              .includes(String(search)?.toLowerCase())
          ) {
            return true;
          }
          return false;
        });
      }

      if (state || city || company) {
        skip = 1;
        searchedData = await contacts.filter((contact) => {
          const matchState =
            !state ||
            contact?.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || contact?.city?.toLowerCase().includes(city?.toLowerCase());
          const matchcompany =
            !company ||
            contact.company?.accountName
              ?.toLowerCase()
              .includes(company?.toLowerCase());
          return matchState && matchCity && matchcompany;
        });
      }

      if (searchedData.length === 0 && skip === 0) {
        searchedData = contacts;
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
      return;
    }
  }

  async getContactsByOrgnizationIdAndOwnerId(user: userInfo) {
    try {
      const contactRepo = AppDataSource.getRepository(Contact)
        .createQueryBuilder("contact")
        .select()
        // .leftJoinAndSelect("contact.owner", "user")
        .where("contact.ownerId=:userId", { userId: user.userId })
        .andWhere("contact.organizationId=:organizationId", {
          organizationId: user.organizationId,
        })
        .orderBy("contact.updatedAt", "DESC");
      const contacts = await contactRepo.getMany();
      for (let contact of contacts) {
        contact =
          contact !== null && contact !== undefined
            ? await contactDecryption(contact as Contact)
            : contact;
      }
      return contacts;
    } catch (error) {
      logger.error(error);
      return;
    }
  }

  async importContacts(
    file: any,
    user: userInfo,
    filename: string,
    transactionEntityManager: EntityManager
  ) {
    // await fs.writeFileSync("./contacts.txt",file.buffer);
    // const data=await fs.readFileSync("./contacts.txt","utf-8");
    const data = file.buffer.toString("utf-8");
    const contactInfo: {
      fullName: string;
      phone: string;
    }[] = [];
    const person: { fullName: string; phone: string } = {
      fullName: "",
      phone: "",
    };
    for (let contact of data.split("\n")) {
      if (contact.includes("FN:")) {
        const name = contact.replace("FN:", "").replace("\r", "");
        person.fullName = name;
      }
      if (contact.includes("TEL;CELL;PREF:") || contact.includes("TEL;CELL:")) {
        person.phone = contact.includes("TEL;CELL:")
          ? contact.replace("TEL;CELL:", "").replace("\r", "")
          : contact.replace("TEL;CELL;PREF:", "").replace("\r", "");
      }
      if (person.fullName && person.phone) {
        contactInfo.push({ ...person });
        person.fullName = "";
        person.phone = "";
      }
    }

    const uniqueContacts = [];
    const phoneNumbers = new Set();

    for (const contact of contactInfo) {
      if (!phoneNumbers.has(contact.phone)) {
        uniqueContacts.push(contact);
        phoneNumbers.add(contact.phone);
      }
    }

    const contacts: Contact[] = uniqueContacts as Contact[];
    const totalCount = contacts.length;
    let SuccessCount = 0;
    let DuplicateCount = 0;
    const duplicateContactData: Array<{
      phone: string;
      fullName: string;
    }> = [];
    let errorCount = 0;
    try {
      const contactRepository = await transactionEntityManager.getRepository(
        Contact
      );
      const accountRepository = await transactionEntityManager.getRepository(
        Account
      );
      const organizationRepo = await transactionEntityManager.getRepository(
        Organisation
      );
      const userdata = await transactionEntityManager
        .getRepository(User)
        .createQueryBuilder("User")
        .where("User.userId = :userId", { userId: user.userId })
        .getOne();

      const arrayContact: Array<Contact> = [];

      // get contact list from table and check phone and email is exist or not
      const existingDeletedContacts = await transactionEntityManager
        .getRepository(Contact)
        .createQueryBuilder("Contact")
        .withDeleted() // This method includes soft-deleted rows in the result
        .where("Contact.organizationId = :organizationId", {
          organizationId: user.organizationId,
        })
        .andWhere("Contact.deletedAt IS NOT NULL")
        .getMany();

      const existingNonDeletedContacts = await transactionEntityManager
        .getRepository(Contact)
        .createQueryBuilder("Contact")
        .where("Contact.organizationId = :organizationId", {
          organizationId: user.organizationId,
        })
        .getMany();

      const existingDeletedPhoneNumbers = new Set(
        existingDeletedContacts.map((contact) => decrypt(contact.phone))
      );
      console.log(
        "existingDeletedPhoneNumbers is : ",
        existingDeletedPhoneNumbers
      );

      const existingNonDeletedPhoneNumbers = new Set(
        existingNonDeletedContacts.map((contact) => decrypt(contact.phone))
      );
      console.log(
        "existingNonDeletedPhoneNumbers is : ",
        existingNonDeletedPhoneNumbers
      );

      await Promise.all(
        contacts.map(async (contact) => {
          const decryptedPhone = `${contact.phone}`;

          // New contact, add it to be inserted
          if (contact.company) {
            const account = await accountRepository.findOne({
              where: { accountName: encryption(String(contact.company)) },
            });
            if (!account) return;
            contact.company = account;
          }

          if (userdata) {
            contact.owner = userdata;
          }

          if (user.organizationId) {
            const orgnizationData = await organizationRepo.findOne({
              where: { organisationId: user.organizationId },
            });
            if (orgnizationData) contact.organization = orgnizationData;
          }

          if (contact.fullName)
            contact.fullName = encryption(contact.fullName);
          contact.countryCode = encryption("+91");
          if (contact.phone) contact.phone = encryption(contact.phone);
          contact.addressLine = encryption("NA");
          contact.area = encryption("NA");
          contact.city = encryption("NA");
          contact.state = encryption("NA");
          contact.country = encryption("India");
          contact.industry = encryption("NA");
          contact.designation = encryption("NA");
          contact.description = encryption(
            "This contact is imported from vcf file"
          );
          contact.social = encryption("NA");
          contact.status = status.ACTIVE;
          contact.favourite = favourite.YES;
          contact.contactId = v4();

          if (existingNonDeletedPhoneNumbers.has(decryptedPhone)) {
            DuplicateCount++;
            console.log("DuplicateCount is : ", DuplicateCount);
            duplicateContactData.push({
              phone: decrypt(contact.phone),
              fullName: decrypt(contact.fullName),
            });
          } else {
            if (existingDeletedPhoneNumbers.has(decryptedPhone)) {
              arrayContact.push(contact);
            } else {
              arrayContact.push(contact);
            }

            SuccessCount++;
          }
        })
      );

      await contactRepository.save(arrayContact);
    } catch (error) {
      errorCount = totalCount - SuccessCount - DuplicateCount;
    }

    const contactDataSummery = {
      totalCount: totalCount,
      SuccessCount: SuccessCount,
      errorCount: errorCount,
      DuplicateCount: DuplicateCount,
      filename: filename,
      duplicateContactData: duplicateContactData,
    };

    return contactDataSummery;
  }
}

export default ContactServices;

// function csv(): any {
//     throw new Error("Function not implemented.");
// }
