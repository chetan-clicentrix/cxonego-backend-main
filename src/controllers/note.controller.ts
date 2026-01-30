import { Response } from "express";
import NoteServices from "../services/note.service";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse, decrypt } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";
import { Role } from "../entity/Role";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { log } from "console";

const noteServices = new NoteServices();
class NoteController {
  async getAllNotesData(request: AuthenticatedRequest, response: Response) {
    try {
      const notes = await noteServices.getAllNotesData(request.user);
      return makeResponse(
        response,
        200,
        true,
        "Notes fetched successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }

  async createNote(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    if (!request.body)
      return makeResponse(
        response,
        404,
        false,
        "Please provide note data",
        null
      );
    try {
      const note = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const note = await noteServices.createNote(
            request.body,
            request.user,
            transactionEntityManager
          );
          return note;
        }
      );

      if (!note) {
        return makeResponse(response, 404, false, "Note Not Created", null);
      }
      return makeResponse(
        response,
        201,
        true,
        "Note created successfully",
        note
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

  async getAllNotes(request: AuthenticatedRequest, response: Response) {
    try {
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getAllNotes(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        organizationId,
        dateRange
      );

      if (notes?.data?.length == 0 || notes == undefined) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteByNoteId(request: AuthenticatedRequest, response: Response) {
    try {
      const noteId: string = request.params.noteId;
      if (!noteId) {
        return makeResponse(response, 400, false, "Note id is required", null);
      }
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      const note = await noteServices.getNoteByNoteId(
        userId,
        role,
        noteId,
        organizationId
      );

      if (!note) {
        return makeResponse(response, 200, false, "Note not found", null);
      }

      return makeResponse(response, 200, true, "Note found successfully", note);
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteByaccountId(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId;
      if (!accountId) {
        return makeResponse(
          response,
          400,
          false,
          "Account id is required",
          null
        );
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getNoteByaccountId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        accountId,
        organizationId,
        dateRange
      );

      if (notes?.data?.length == 0) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteBycontactId(request: AuthenticatedRequest, response: Response) {
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
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getNoteBycontactId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        contactId,
        organizationId,
        dateRange
      );

      console.log("notes is this :", notes);

      if (notes?.data?.length == 0) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteByleadId(request: AuthenticatedRequest, response: Response) {
    try {
      const leadId: string = request.params.leadId;
      if (!leadId) {
        return makeResponse(response, 400, false, "Lead id is required", null);
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getNoteByleadId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        leadId,
        organizationId,
        dateRange
      );

      if (notes?.data?.length == 0) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteByOpportunityId(request: AuthenticatedRequest, response: Response) {
    try {
      const opportunityId: string = request.params.opportunityId;
      if (!opportunityId) {
        return makeResponse(
          response,
          400,
          false,
          "opportunityId is required",
          null
        );
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getNoteByOpportunityId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        opportunityId,
        organizationId,
        dateRange
      );

      if (notes?.data?.length == 0) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async updateNote(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const noteId: string = request.params.noteId as string;
      if (!noteId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide note id",
          null
        );
      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "Please provide note data",
          null
        );

      const note = await noteServices.updateNote(
        noteId,
        request.body,
        request.user
      );

      if (note?.affected == 0 || note == undefined) {
        return makeResponse(response, 400, false, "Note not updated", null);
      }

      return makeResponse(
        response,
        201,
        true,
        "Note updated successfully",
        note
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

  async bulkDeleteNote(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const email = request.user.email;
      const note = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const note = await noteServices.bulkDeleteNote(
            request.body.noteIds,
            email,
            transactionEntityManager
          );
          return note;
        }
      );

      if (note?.deleted?.length == 0) {
        return makeResponse(response, 400, false, "Note not deleted", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Note deleted successfully",
        note
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getNoteByActivityId(request: AuthenticatedRequest, response: Response) {
    try {
      const activityId: string = request.params.activityId;
      if (!activityId) {
        return makeResponse(
          response,
          400,
          false,
          "activityId is required",
          null
        );
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const notes = await noteServices.getNoteByActivityId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        activityId,
        organizationId,
        dateRange
      );

      if (notes?.data?.length == 0) {
        return makeResponse(response, 200, false, "Notes not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Notes found successfully",
        notes
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
}

export default NoteController;
