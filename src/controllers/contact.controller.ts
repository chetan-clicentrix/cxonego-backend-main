import { Request, Response } from "express";
import ContactServices from "../services/contact.service";
import { makeResponse, decrypt } from "../common/utils";
import { errorHandler } from "../common/errors";
import { ContactSchemaType } from "../schemas/contact.schema";
import { Contact } from "../entity/Contact";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
const _contactServices = new ContactServices();

class ContactController {
  async getAllContacts(request: AuthenticatedRequest, response: Response) {
    try {
      const contacts = await _contactServices.getAllContacts(request.user);
      return makeResponse(response, 200, true, "All contacts", contacts);
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getContacts(request: AuthenticatedRequest, response: Response) {
    try {
      let page = Number(request.query.page);
      let limit = Number(request.query.limit);
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }

      const search: string | undefined = request.query.search as string;
      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city;
      const company: string = request.body.company;
      const industry: string[] = request.body.industry as string[];
      const status: string[] = request.body.status as string[];
      const favourite: string[] = request.body.favourite as string[];
      const contactType = request.body.contactType as string[];
      const role: Role[] = request.user.role;
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      let view: string = request.query.view as string;

      const contact = await _contactServices.getContacts(
        userId,
        role,
        search,
        country,
        state,
        city,
        company,
        industry,
        status,
        favourite,
        contactType,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        organizationId,
        view
      );

      if (!contact) {
        return makeResponse(response, 200, false, "Contacts not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Contacts fetched successfully",
        contact
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getContact(request: Request, response: Response) {
    try {
      const contactId: string = request.params.contactId;
      if (!contactId) {
        return makeResponse(
          response,
          400,
          false,
          "Contact id is required",
          null
        );
      }
      const contact = await _contactServices.getContact(contactId);
      if (!contact) {
        return makeResponse(response, 200, false, "Contact not found", null);
      }
      return makeResponse(response, 200, true, "Contact found", contact);
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async bulkDeleteContact(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const auth_time = request.user.auth_time;
      const email = request.user.email;
      const payload = request.body.contactIds;
      if (!payload) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide contact Id's",
          null
        );
      }

      const contact = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await _contactServices.bulkDeleteContact(
            payload,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return contact;
        }
      );

      if (contact?.deleted?.length == 0) {
        return makeResponse(response, 400, false, "Contact not deleted", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Contact deleted successfully",
        contact
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async createContact(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const contact = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await _contactServices.createContact(
            request.body,
            request.user,
            transactionEntityManager
          );

          return contact;
        }
      );

      if (!contact) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to create contact",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Contact created successfully",
        contact
      );
    } catch (error) {
      console.log("ERROR is : ", error);
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }

  async updateContact(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const contactId: string = request.params.contactId;
      const payload: Contact = request.body;
      if (!contactId) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide contactId",
          null
        );
      }
      if (!payload) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide contact details",
          null
        );
      }

      const contact = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await _contactServices.updateContact(
            payload,
            contactId,
            request.user,
            transactionEntityManager
          );
          return contact;
        }
      );

      if (!contact || contact == undefined) {
        return makeResponse(response, 400, false, "Contact not updated", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Contact updated successfully",
        contact
      );
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }

  async deleteContact(request: AuthenticatedRequest, response: Response) {
    try {
      const contactId: string = request.params.contactId;
      const contact = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await _contactServices.deleteContact(
            contactId,
            request.user,
            transactionEntityManager
          );
          return contact;
        }
      );

      if (!contact) {
        return makeResponse(response, 404, false, "Contact not found", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Contact deleted successfully",
        contact
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async partiallyUpdateContact(request: AuthenticatedRequest, response: Response) {
    try {
      const contactId: string = request.params.contactId as string;
      if (!contactId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide contact id",
          null
        );
      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "Please provide contact data",
          null
        );

      const payload: Contact = request.body as Contact;

      const contact = await _contactServices.partiallyUpdateContact(
        contactId,
        payload
      );

      if (!contact) {
        return makeResponse(
          response,
          404,
          false,
          "Failed to update Contact",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Contact updated successfully",
        contact
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async UploadContactExcel(request: AuthenticatedRequest, response: Response) {
    try {
      const file = request.file;

      if (!file) {
        return makeResponse(response, 400, false, "File is required", null);
      }

      const fileExtension = file?.originalname?.substring(
        file?.originalname?.lastIndexOf(".")
      );

      if (!fileExtension.includes(".xlsx")) {
        return makeResponse(
          response,
          400,
          false,
          "File must be in .xlsx format",
          null
        );
      }

      const bulkContacts = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await _contactServices.uploadCotactUsingExcel(
            file,
            request.user,
            file.originalname,
            transactionEntityManager
          );
          return contact;
        }
      );

      if (!bulkContacts) {
        return makeResponse(
          response,
          400,
          false,
          "Contacts not uploaded",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Contacts Summery Report",
        bulkContacts
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getContactByAccountId(request: AuthenticatedRequest, response: Response) {
    try {
      let page = Number(request.query.page);
      let limit = Number(request.query.limit);
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }
      const accountId = request.params.accountId as string;
      const search: string | undefined = request.query.search as string;
      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city;
      const company: string = request.body.company;
      const industry: string[] = request.body.industry as string[];
      const status: string[] = request.body.status as string[];
      const favourite: string[] = request.body.favourite as string[];
      const contactType = request.body.contactType as string[];
      const role: Role[] = request.user.role;
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;

      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const contact = await _contactServices.getContactByAccountId(
        userId,
        role,
        search,
        country,
        state,
        city,
        company,
        industry,
        status,
        favourite,
        contactType,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        accountId,
        organizationId
      );

      if (!contact) {
        return makeResponse(response, 200, false, "Contacts not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Contacts fetched successfully",
        contact
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getContactsByOrgnizationIdAndOwnerId(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const contacts =
        await _contactServices.getContactsByOrgnizationIdAndOwnerId(
          request.user
        );
      if (contacts?.length == 0) {
        return makeResponse(response, 200, true, "Contacts not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Contacts found successfully",
        contacts
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async uploadContactsUsingVCF(request: AuthenticatedRequest, response: Response) {
    const file = request.file;
    if (!file) {
      return makeResponse(response, 400, false, "File is required", null);
    }

    const fileExtension = file?.originalname?.substring(
      file?.originalname?.lastIndexOf(".")
    );

    if (!fileExtension.includes(".vcf")) {
      return makeResponse(
        response,
        400,
        false,
        "File must be in .vcf format",
        null
      );
    }

    const contacts = await AppDataSource.transaction(
      async (transactionEntityManager) => {
        const contact = await _contactServices.importContacts(
          file,
          request.user,
          file.originalname,
          transactionEntityManager
        );
        return contact;
      }
    );

    if (!contacts) {
      return makeResponse(
        response,
        400,
        false,
        "Failed to upload contacts",
        null
      );
    }
    return makeResponse(
      response,
      200,
      true,
      "Contacts Summery Report",
      contacts
    );
  }
}
export default ContactController;
