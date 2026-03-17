import {Response} from "express";
import MoodServices from "../services/mood.service";
import { makeResponse, moodCategory } from "../common/utils";
import { errorHandler } from "../common/errors";
// import { ContactSchemaType } from "../schemas/contact.schema";
// import { Contact } from "../entity/Contact";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
// import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { MoodSchemaType } from "../schemas/mood.schemas";
import { MoodImage } from "../entity/MoodImage";
import { User } from "../entity/User";
const _moodServices = new MoodServices();

class MoodController{
   	
	async addMoodImage(request:AuthenticatedRequest,response:Response){
        try {
            const userId = request.user.userId;
            // const moodes:MoodImage[] = request.body.imgarray as MoodImage[]; 
            const moodeData : MoodImage = request.body as MoodImage;  
            const mood = await AppDataSource.transaction(
                async (transactionEntityManager)=>{
                    const mood = await _moodServices.createMood(
                        moodeData,
                        userId,
                        transactionEntityManager
                    );
                    return mood;
                }
            );

            if(mood == null){
                return makeResponse(response, 404, false, "Mood image not created", null);
            }             
            return makeResponse(response, 201, true, "Mood created successfully", mood);
        } catch (error) {
            errorHandler(response, error.message);
        }
    }
	    
  async getAllMoodImages(request:AuthenticatedRequest, response: Response) {
        try{                  
            const moodCategory:moodCategory = request.query.moodCategory as moodCategory;
            
            const moodImages = await _moodServices.getAllMoodImages(moodCategory);        
            
            if(!moodImages){
                return makeResponse(response, 200, false, "Mood images not found", null);
            }
            return makeResponse(response, 200, true, "Mood images fetched successfully", moodImages);
        }catch(error){
            return errorHandler(response, error.message); 
        }
    }


    async setMoodOfUser(request:AuthenticatedRequest,response:Response){
        try{
            const mood:User = await AppDataSource.transaction(
                async(transactionEntityManager)=>{
                    const mood =await _moodServices.setMoodOfUser(
                        request.body.userId,
                        request.body.backgroundImageUrl,      
                        transactionEntityManager
                    )
                    return mood;
                }
            )
            if(!mood){
                return makeResponse(response, 404, false, "User Mood Not updated", null);
            }
            return makeResponse(response, 200, true, "User Mood Updated Successfully", mood);
        }catch(error){
            errorHandler(response, error.message);
        }
    }
}
export default MoodController;