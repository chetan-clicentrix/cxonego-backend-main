import { Response } from "express";
import { errorHandler } from "../common/errors";
import { makeResponse } from "../common/utils";
import { AuthenticatedRequest } from "../interfaces/types";
import RoleServices from "../services/role.service";

const roleService = new RoleServices();
class RoleController{
    async getRoles(_request:AuthenticatedRequest,response:Response){
        try{            
            const roles=await roleService.getRoles();
            if(!roles){
                return makeResponse(response, 200, false, "Role not found", null);
            }
            return makeResponse(response, 200, true, "Role fetched successfully", roles);
        }catch(error){
            errorHandler(response,error);
        }
    }
    async createRole(request:AuthenticatedRequest,response:Response){
        try{
            const role=await roleService.createRole(request.body);
            
            if(!role){
                return makeResponse(response, 404, false, "Fail to create role", null);
            }
            return makeResponse(response, 201, true, "Role created successfully", role);
        }catch(error){
            errorHandler(response,error);
        }
    }
    async updateRole(request:AuthenticatedRequest,response:Response){
        try{
            const roleId = Number(request.params.roleId);
            const role=await roleService.updateRole(roleId,request.body);
            if(!role){
                return makeResponse(response, 404, false, "Role not found", null);
            }
            return makeResponse(response, 200, true, "Role updated successfully", role);
        }catch(error){
            errorHandler(response,error);
        }
    }

    async deleteRole(request:AuthenticatedRequest,response:Response){
        try{
            const roleId = Number(request.params.roleId);
            const role=await roleService.deleteRole(roleId);
            if(!role){
                return makeResponse(response, 404, false, "Fail to delete role", null);
            }
            return makeResponse(response, 200, true, "Role deleted successfully", role);
        }catch(error){
            errorHandler(response,error);
        }
    }
}

export default RoleController;