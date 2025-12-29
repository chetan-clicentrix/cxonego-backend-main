import axios from 'axios';
import { AppDataSource } from "../data-source";
import { Lead } from '../entity/Lead';
import { ratingRate, statusType, Currency, encryption, decrypt } from '../common/utils';
import { User } from '../entity/User';
import LeadService from './lead.service';
import { userInfo } from "../interfaces/types";
import { v4 as uuidv4 } from 'uuid';
import { Organisation } from '../entity/Organisation';
import leadAssignmentService from "./leadAssignment.service";
import { EntityManager } from "typeorm";
import LeadRoutingConfigService from "./leadRoutingConfig.service";


interface IndiaMartLead {
  UNIQUE_QUERY_ID: string;
  QUERY_TYPE: string;
  QUERY_TIME: string;
  SENDER_NAME: string;
  SENDER_MOBILE: string;
  SENDER_EMAIL: string;
  SENDER_COMPANY: string;
  SENDER_ADDRESS: string;
  SENDER_CITY: string;
  SENDER_STATE: string;
  SENDER_PINCODE: string;
  SENDER_COUNTRY_ISO: string;
  SENDER_MOBILE_ALT: string | null;
  SENDER_EMAIL_ALT: string | null;
  QUERY_PRODUCT_NAME: string;
  QUERY_MESSAGE: string;
  QUERY_MCAT_NAME: string;
  CALL_DURATION: string | null;
  RECEIVER_MOBILE: string | null;
}

interface IndiaMartResponse {
  CODE: number;
  STATUS: string;
  MESSAGE: string;
  TOTAL_RECORDS: number;
  RESPONSE: IndiaMartLead[];
}

class IndiaMartService {
  private leadService: LeadService;
  private leadRoutingConfigService: LeadRoutingConfigService;

  constructor() {
    this.leadService = new LeadService();
    this.leadRoutingConfigService = new LeadRoutingConfigService();
  }

  async fetchLeads(): Promise<IndiaMartLead[]> {
    try {
      const apiKey = process.env.INDIA_MART_API_KEY || '';

      // If no API key is provided, use sample data with unique IDs
      if (!apiKey || apiKey === 'your_api_key_here') {
        console.log('Using sample IndiaMART data for testing (no API key provided)');
        return this.getSampleData().RESPONSE;
      }

      const baseUrl = process.env.INDIA_MART_BASE_URL || 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';

      const response = await axios.get(baseUrl, {
        params: {
          glusr_crm_key: apiKey,
          start_time: this.getStartTimeForQuery(),
          end_time: this.getEndTimeForQuery()
        }
      });

      const data = response.data as IndiaMartResponse;

      if (data.CODE === 200 && data.STATUS === 'SUCCESS' && Array.isArray(data.RESPONSE)) {
        console.log(`Fetched ${data.TOTAL_RECORDS} leads from IndiaMART`);
        return data.RESPONSE;
      }

      console.log('No leads found or API error:', data.MESSAGE);
      return [];
    } catch (error) {
      console.error('Error fetching leads from IndiaMART:', error);

      // On error, also return sample data for testing
      console.log('Using sample IndiaMART data due to fetch error');
      return this.getSampleData().RESPONSE;
    }
  }

  private getStartTimeForQuery(): string {
    const date = new Date(Date.now() - 15 * 60 * 1000);

    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${day}-${month}-${year}${hours}:${minutes}:${seconds}`;
  }

  private getEndTimeForQuery(): string {
    const date = new Date();

    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${day}-${month}-${year}${hours}:${minutes}:${seconds}`;
  }

  async processAndSaveLeads(): Promise<number> {
    try {
      const indiaMartLeads = await this.fetchLeads();
      if (indiaMartLeads.length === 0) {
        return 0;
      }

      // Get the default handler for organization information
      const defaultHandler = await this.getDefaultHandler();
      if (!defaultHandler) {
        console.error('Default lead handler could not be determined');
        return 0;
      }

      // Get the organization
      const organization = await this.getOrganization(defaultHandler);
      if (!organization) {
        console.error('Organization could not be determined');
        return 0;
      }

      // Start a transaction
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      let savedCount = 0;

      try {
        for (const imLead of indiaMartLeads) {
          try {
            // Check for duplicate leads
            const isDuplicate = await this.checkDuplicateLead(imLead.UNIQUE_QUERY_ID);
            if (isDuplicate) {
              console.log(`Skipping duplicate lead: ${imLead.UNIQUE_QUERY_ID}`);
              continue;
            }

            // Get the product name from the IndiaMart lead
            const leadType = imLead.QUERY_PRODUCT_NAME || "Unknown Product";

            // Register this lead type if it doesn't exist yet
            await leadAssignmentService.registerLeadType(
              leadType,
              organization.organisationId,
              defaultHandler.userId,
              queryRunner.manager
            );

            // First, try rule-based routing using LeadRoutingConfigService
            const tempLead = this.mapIndiaMArtLeadToLead(
              imLead,
              "", // dummy ID
              {} as any, // dummy owner
              organization
            );

            const routedUserId = await this.leadRoutingConfigService.executeRouting(tempLead);
            let effectiveOwner: User | null = null;

            if (routedUserId) {
              effectiveOwner = await queryRunner.manager.getRepository(User).findOne({
                where: { userId: routedUserId },
                relations: ['roles', 'organisation']
              });
              if (effectiveOwner) {
                console.log(`Lead routed via rules to user ${effectiveOwner.userId}`);
              }
            }

            if (!effectiveOwner) {
              // Get the appropriate owner for this lead type (legacy assignment logic)
              effectiveOwner = await this.getLeadOwner(
                leadType,
                organization.organisationId,
                queryRunner.manager
              );
            }

            if (!effectiveOwner) {
              console.error(`Could not determine owner for lead type "${leadType}"`);
              continue;
            }

            // Create properly-typed userInfo object for lead creation
            const userInfo: userInfo = {
              userId: effectiveOwner.userId,
              email: decrypt(effectiveOwner.email),
              organizationId: organization.organisationId,
              auth_time: Date.now(),
              emailVerified: true,
              role: effectiveOwner.roles || []
            };

            // Get a proper lead ID
            const leadId = await this.leadService.getLeadId(new Date());

            // Map IndiaMART lead to our Lead format with the effective owner
            const leadPayload = this.mapIndiaMArtLeadToLead(
              imLead,
              leadId,
              effectiveOwner,
              organization
            );

            // Add the lead type for reference
            leadPayload.leadType = leadType;

            console.log(`Creating lead with ID ${leadId} for product "${leadType}" assigned to ${effectiveOwner.userId}`);

            await this.leadService.createLead(
              leadPayload as Lead,
              userInfo,
              queryRunner.manager
            );

            savedCount++;
            console.log(`Successfully created lead: ${leadId}`);
          } catch (error) {
            console.error(`Error processing lead ${imLead.UNIQUE_QUERY_ID}:`, {
              error: error.message,
              stack: error.stack
            });
            throw error;
          }
        }

        await queryRunner.commitTransaction();
        return savedCount;
      } catch (error) {
        console.error('Transaction rolling back:', {
          error: error.message,
          stack: error.stack,
          savedCount
        });
        await queryRunner.rollbackTransaction();
        return 0;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('Error in processAndSaveLeads:', error);
      return 0;
    }
  }

  /**
   * Get the default IndiaMart handler (for fallback)
   */
  private async getDefaultHandler(): Promise<User | null> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const defaultHandler = await userRepository.findOne({
        where: {
          email: encryption(process.env.INDIAMART_HANDLER_EMAIL || '')
        },
        relations: ['roles', 'organisation']
      });

      if (!defaultHandler) {
        console.error(`Default handler not found for email: ${process.env.INDIAMART_HANDLER_EMAIL}`);
        return null;
      }

      return defaultHandler;
    } catch (error) {
      console.error('Error finding default handler:', error);
      return null;
    }
  }

  /**
   * Get the appropriate lead owner for a specific lead type
   * First checks if the lead type has an assigned owner in lead assignments
   * Falls back to the default IndiaMart handler if no assignment exists
   */
  private async getLeadOwner(leadType: string, organisationId: string, entityManager?: EntityManager): Promise<User | null> {
    try {
      // First try to get the assigned user from lead assignments
      console.log(`Checking for assigned owner for lead type: ${leadType}`);

      // Get lead assignment for this lead type and organization
      const leadAssignment = await leadAssignmentService.getLeadAssignment(leadType);

      // Check if we have an assignment and if it belongs to the correct organization
      if (leadAssignment && leadAssignment.user && leadAssignment.organisationId === organisationId) {
        console.log(`Found assignment for lead type "${leadType}": user ${leadAssignment.user.userId}`);
        return leadAssignment.user;
      }

      // If no assignment found or wrong organization, fall back to default handler
      console.log(`No lead assignment found for "${leadType}" in organization ${organisationId}, using default handler`);
      const userRepository = entityManager
        ? entityManager.getRepository(User)
        : AppDataSource.getRepository(User);

      const defaultHandler = await userRepository.findOne({
        where: {
          email: encryption(process.env.INDIAMART_HANDLER_EMAIL || '')
        },
        relations: ['roles', 'organisation']
      });

      if (!defaultHandler) {
        console.error(`Default handler not found for email: ${process.env.INDIAMART_HANDLER_EMAIL}`);
        return null;
      }

      return defaultHandler;
    } catch (error) {
      console.error('Error finding lead owner:', error);
      return null;
    }
  }

  private async getOrganization(user: User): Promise<Organisation | null> {
    if (!user.organisation) {
      return null;
    }

    try {
      const organizationRepository = AppDataSource.getRepository(Organisation);
      return await organizationRepository.findOne({
        where: { organisationId: user.organisation.organisationId }
      });
    } catch (error) {
      console.error('Error finding organization:', error);
      return null;
    }
  }

  private async checkDuplicateLead(uniqueQueryId: string): Promise<boolean> {
    try {
      const leadRepository = AppDataSource.getRepository(Lead);

      // First check by externalId
      const leadByExternalId = await leadRepository.findOne({
        where: { externalId: uniqueQueryId }
      });

      if (leadByExternalId) {
        return true;
      }

      // Fallback check by description content (for backward compatibility)
      const leadByDescription = await leadRepository
        .createQueryBuilder('lead')
        .where('lead.description LIKE :query', { query: `%${uniqueQueryId}%` })
        .getOne();

      return !!leadByDescription;
    } catch (error) {
      console.error('Error checking for duplicate lead:', error);
      return false;
    }
  }

  private mapIndiaMArtLeadToLead(
    imLead: IndiaMartLead,
    leadId: string,
    owner: User,
    organization: Organisation
  ): Lead {
    // Split name into first and last name
    const nameParts = imLead.SENDER_NAME ? imLead.SENDER_NAME.split(' ') : ['Unknown'];
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Handle phone number format
    let phone = imLead.SENDER_MOBILE || '';
    let countryCode = '+91'; // Default for India

    if (phone.startsWith('+')) {
      const parts = phone.split('-');
      if (parts.length > 1) {
        countryCode = parts[0];
        phone = parts[1];
      }
    }

    // Build the description including the unique ID (for deduplication)
    const description = `IndiaMART Lead ID: ${imLead.UNIQUE_QUERY_ID || ''}
Product: ${imLead.QUERY_PRODUCT_NAME || ''}
Category: ${imLead.QUERY_MCAT_NAME || ''}
Message: ${imLead.QUERY_MESSAGE || ''}
Company: ${imLead.SENDER_COMPANY || ''}
Address: ${imLead.SENDER_ADDRESS || ''}`;

    // Create a complete Lead instance with all required fields
    const lead = new Lead({
      leadId,
      firstName,
      lastName,
      phone,
      countryCode: countryCode || '+91',
      email: imLead.SENDER_EMAIL || 'unknown@example.com',
      title: imLead.QUERY_PRODUCT_NAME || 'IndiaMART Inquiry',
      country: imLead.SENDER_COUNTRY_ISO === 'IN' ? 'India' : (imLead.SENDER_COUNTRY_ISO || 'India'),
      state: imLead.SENDER_STATE || 'Unknown',
      city: imLead.SENDER_CITY || 'Unknown',
      leadSource: 'IndiaMART',
      description,
      rating: ratingRate.HOT,
      status: statusType.NEW,
      currency: Currency.EUR,
      externalId: imLead.UNIQUE_QUERY_ID,
      owner,
      organization,
      modifiedBy: owner.userId
    } as Lead);

    return lead;
  }

  // Function to generate sample data with unique IDs
  private getSampleData(): IndiaMartResponse {
    const timestamp = new Date().getTime();
    return {
      CODE: 200,
      STATUS: "SUCCESS",
      MESSAGE: "",
      TOTAL_RECORDS: 2,
      RESPONSE: [
        {
          UNIQUE_QUERY_ID: `TEST${timestamp}1`,
          QUERY_TYPE: "W",
          QUERY_TIME: new Date().toISOString().replace('T', ' ').substring(0, 19),
          SENDER_NAME: "Nishad Bhusari",
          SENDER_MOBILE: "+91-9876543210",
          SENDER_EMAIL: "test@example.com",
          SENDER_COMPANY: "Test Company Pvt Ltd",
          SENDER_ADDRESS: "123 Test Street, Test Area",
          SENDER_CITY: "Mumbai",
          SENDER_STATE: "Maharashtra",
          SENDER_PINCODE: "400001",
          SENDER_COUNTRY_ISO: "IN",
          SENDER_MOBILE_ALT: null,
          SENDER_EMAIL_ALT: null,
          QUERY_PRODUCT_NAME: "MCLaren",
          QUERY_MESSAGE: "Looking for CRM software for our company.",
          QUERY_MCAT_NAME: "Software Solutions",
          CALL_DURATION: null,
          RECEIVER_MOBILE: null
        },
        {
          UNIQUE_QUERY_ID: `TEST${timestamp}2`,
          QUERY_TYPE: "W",
          QUERY_TIME: new Date().toISOString().replace('T', ' ').substring(0, 19),
          SENDER_NAME: "Another Lead",
          SENDER_MOBILE: "+91-8765432109",
          SENDER_EMAIL: "lead@example.com",
          SENDER_COMPANY: "Lead Enterprises",
          SENDER_ADDRESS: "456 Lead Road, Business District",
          SENDER_CITY: "Delhi",
          SENDER_STATE: "Delhi",
          SENDER_PINCODE: "110001",
          SENDER_COUNTRY_ISO: "IN",
          SENDER_MOBILE_ALT: null,
          SENDER_EMAIL_ALT: null,
          QUERY_PRODUCT_NAME: "BE6",
          QUERY_MESSAGE: "Need a system to manage our sales leads efficiently.",
          QUERY_MCAT_NAME: "Business Software",
          CALL_DURATION: null,
          RECEIVER_MOBILE: null
        }
      ]
    };
  }
}

export default IndiaMartService; 