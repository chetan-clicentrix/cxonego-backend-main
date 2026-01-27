import { AppDataSource } from "../data-source";
import { Lead } from "../entity/Lead";
import { Contact } from "../entity/Contact";
import { decrypt, encryption, roleNames, statusType, stage as stageEnum } from "../common/utils";
import {
  accountDecryption,
  activityDecryption,
  contactDecryption,
  leadDecryption,
  opportunityDecryption,
  userDecryption,
} from "./decryption.service";
import { Account } from "../entity/Account";
import {
  RangeDateType,
  RevenueRangeParamsType,
} from "../schemas/comman.schemas";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Activity } from "../entity/Activity";
import { Role } from "../entity/Role";
import {
  activity_status_percentage_dataType,
  finalLeadObjectSchemaType,
  categorycountdataType,
  statusdataType,
  stagedataType,
  categoryStageOpportunityDataType,
  finalOpportunityObjectSchemaType,
  finalLeadPaginationObjectSchemaType,
  finalOpportunityPaginationObjectSchemaType,
  activity_type_percentage_dataType,
} from "../schemas/dashboard.schemas";
import { User } from "../entity/User";

class DashboardServices {
  async getAllLeadStatusCounts() {
    try {
      let counts = await AppDataSource.getRepository(Lead)
        .createQueryBuilder("Lead")
        .select("Lead.status AS status")
        .addSelect("COUNT(*) AS count")
        .groupBy("Lead.status")
        .getRawMany();

      if (counts.length > 0) {
        const allCategories = ["New", "In Progress", "Closed", "Qualified"];
        const countsMap = new Map();
        allCategories.forEach((category) => {
          countsMap.set(category, 0);
        });
        counts.forEach((count) => {
          countsMap.set(count.status, parseInt(count.count));
        });
        const result = Array.from(countsMap, ([status, count]) => ({
          status,
          count,
        }));
      } else {
        counts = [];
      }

      return counts;
    } catch (error) {
      return;
    }
  }

  async getAllLeadStatusPercentage() {
    try {
      let counts = await AppDataSource.getRepository(Lead)
        .createQueryBuilder("Lead")
        .select("Lead.status AS status")
        .addSelect("COUNT(*) AS count")
        .groupBy("Lead.status")
        .getRawMany();

      if (counts.length > 0) {
        const allCategories = ["New", "In Progress", "Closed", "Qualified"];
        const countsMap = new Map();
        allCategories.forEach((category) => {
          countsMap.set(category, 0);
        });
        counts.forEach((count) => {
          countsMap.set(count.status, parseInt(count.count));
        });

        const totalCount = Array.from(countsMap.values()).reduce(
          (total, count) => total + count,
          0
        );

        const percentages = Array.from(countsMap.entries()).map(
          ([status, count]) => ({
            status,
            percentage: (count / totalCount) * 100 + "%",
          })
        );
      } else {
        counts = [];
      }

      return counts;
    } catch (error) {
      return;
    }
  }

  async qualifiedLeadRate() {
    try {
      let counts = await AppDataSource.getRepository(Lead)
        .createQueryBuilder("Lead")
        .select("Lead.status AS status")
        .addSelect("COUNT(*) AS count")
        .groupBy("Lead.status")
        .getRawMany();

      let qualifiedCount = 0;
      let totalCount = 0;
      let qualifiedRate = 0;

      if (counts.length > 0) {
        counts.forEach((item) => {
          if (item.status === "Qualified") {
            qualifiedCount = parseInt(item.count);
          }
          totalCount += parseInt(item.count);
        });

        qualifiedRate = qualifiedCount / totalCount;
      } else {
        qualifiedRate = 0;
      }

      return qualifiedRate.toFixed(2);
    } catch (error) {
      return;
    }
  }

  async getAvgAndEstPrice() {
    try {
      const leads = await AppDataSource.getRepository(Lead)
        .createQueryBuilder("Lead")
        .select(["Lead.price"])
        .getMany();

      const totalLeadsCount = leads.length;
      if (totalLeadsCount === 0) {
        return;
      }
      let totalRevenue = 0;
      leads.forEach((lead) => {
        const decryptedPrice = Number(decrypt(lead.price));
        totalRevenue += decryptedPrice;
      });

      const AvgLeadPrice = totalRevenue / totalLeadsCount;

      return {
        Average_Lead_Price: AvgLeadPrice.toFixed(2),
        Estemated_Lead_Price: totalRevenue,
      };
    } catch (error) {
      return;
    }
  }

  async getLeadsData(type: string, dateString: string) {
    try {
      let leads;
      const dateComponents = dateString.split(" ");
      // const day = dateComponents[1];
      const date = parseInt(dateComponents[0].split("-")[2]);
      const month = parseInt(dateComponents[0].split("-")[1]);
      const year = parseInt(dateComponents[0]);
      const currentDate = new Date(dateString);
      const dayIndex = currentDate.getDay(); // 0 for Sunday, 1 for Monday, etc.

      if (type === "day") {
        leads = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("Lead")
          .select()
          .where("DATE(Lead.createdAt) = :today", { today: dateString })
          .getMany();
      } else if (type === "week") {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - dayIndex);
        const endOfWeek = new Date(currentDate);
        // endOfWeek.setDate(currentDate.getDate() + (6 - dayIndex)); // End of the current week

        leads = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("Lead")
          .select()
          .where("DATE(Lead.createdAt) BETWEEN :startOfWeek AND :endOfWeek", {
            startOfWeek,
            endOfWeek,
          })
          .getMany();
      } else if (type === "month") {
        leads = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("Lead")
          .select()
          .where(
            "MONTH(Lead.createdAt) = :month AND YEAR(Lead.createdAt) = :year",
            { month: month, year: year }
          )
          .getMany();
      } else if (type === "year") {
        leads = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("Lead")
          .select()
          .where("YEAR(Lead.createdAt) = :year", { year: year })
          .getMany();
      }
      return leads;
    } catch (error) {
      return;
    }
  }

  async getLeadsDashboardData(
    ownerId: string,
    role: Role[],
    country: string[] | undefined,
    state: string | undefined,
    city: string | undefined,
    leadSource: string[] | undefined,
    salesPerson: string | undefined,
    revenueRange: RevenueRangeParamsType,
    dateRange: RangeDateType,
    page: number | undefined,
    limit: number | undefined,
    search: string | undefined,
    status: string | undefined,
    organizationId: string | null
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
      if (role.length === 1 && role[0].roleName === roleNames.SALESPERSON) {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.ownerId=:ownerId", { ownerId: ownerId })
          .andWhere("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      } else {
        leadRepo = await AppDataSource.getRepository(Lead)
          .createQueryBuilder("lead")
          .leftJoinAndSelect("lead.company", "account")
          .leftJoinAndSelect("lead.contact", "contact")
          .leftJoinAndSelect("lead.owner", "user")
          .where("lead.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      }

      if (country && country.length > 0) {
        leadRepo.andWhere("lead.country IN (:country)", {
          country: countryArray,
        });
      }

      if (leadSource && leadSource.length > 0) {
        leadRepo.andWhere("lead.leadSource IN (:leadSource)", {
          leadSource: leadSourceArray,
        });
      }

      leadRepo.orderBy("lead.updatedAt", "DESC");
      let leads = await leadRepo.getMany();

      for (let lead of leads) {
        lead = await leadDecryption(lead);
        lead.company = await accountDecryption(lead.company as Account);
        lead.contact = await contactDecryption(lead.contact as Contact);
        lead.owner = await userDecryption(lead.owner as User);
      }

      if (city) {
        leads = leads.filter((lead) =>
          lead.city.toLowerCase().includes(city?.toLowerCase())
        );
      }
      if (state) {
        leads = leads.filter((lead) =>
          lead.state.toLowerCase().includes(state?.toLowerCase())
        );
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          leads = this.filterLeadsByDateRange(
            leads,
            dateRange.startDate,
            dateRange.endDate
          );
        }
      }

      if (revenueRange) {
        if (revenueRange.startPrice && revenueRange.endPrice) {
          leads = await this.filterLeadsByPrice(leads, revenueRange);
        }
      }

      if (state || city || salesPerson) {
        let firstName = "";
        let lastName = "";
        if (salesPerson) {
          const nameParts: string[] = salesPerson.split(" ");
          firstName = nameParts[0];
          lastName = nameParts[1];
        }
        leads = leads.filter((lead) => {
          const matchState =
            !state || lead.state?.toLowerCase().includes(state?.toLowerCase());
          const matchCity =
            !city || lead.city?.toLowerCase().includes(city?.toLowerCase());
          const matchSalesPerson =
            !salesPerson ||
            lead.owner?.firstName
              ?.toLowerCase()
              .includes(firstName?.toLowerCase()) ||
            lead.owner?.lastName
              ?.toLowerCase()
              .includes(lastName?.toLowerCase());

          return matchState && matchCity && matchSalesPerson;
        });
      }

      //chart percentage count
      const allCategories = ["New", "In Progress", "Closed", "Qualified"];
      const countsMap = new Map<string, number>();
      // Initialize countsMap with 0 for each category
      allCategories.forEach((category) => {
        countsMap.set(category, 0);
      });

      // Count the leads status-wise
      leads.forEach((lead) => {
        const status = lead.status;
        if (countsMap.has(status)) {
          countsMap.set(status, countsMap.get(status)! + 1);
        } else {
          countsMap.set(status, 1);
        }
      });

      // Convert countsMap to an array of objects
      let counts = Array.from(countsMap, ([status, count]) => ({
        status,
        count,
      }));

      // Calculate total count
      const totalCount = counts.reduce((total, { count }) => total + count, 0);

      // Calculate percentages
      const countsData = counts.map(({ status, count }) => ({
        status,
        percentage:
          totalCount !== 0 ? ((count / totalCount) * 100).toFixed(2) : 0, // Check if totalCount is 0
      })) as statusdataType[];

      //chart category count
      const countsMap2 = new Map<string, number>();
      // Initialize countsMap with 0 for each category
      allCategories.forEach((category) => {
        countsMap2.set(category, 0);
      });

      let catcountsData: { status: string; count: number }[] = [];
      // Initialize countsMap with 0 for each category
      leads.forEach((lead) => {
        const status = lead.status;
        if (countsMap2.has(status)) {
          countsMap2.set(status, countsMap2.get(status)! + 1);
        } else {
          countsMap2.set(status, 1);
        }
      });
      // Convert countsMap to an array of objects
      catcountsData = Array.from(countsMap2, ([status, count]) => ({
        status,
        count,
      })) as categorycountdataType[];
      //total open leads
      const newLeadsCount = leads.reduce((count, lead) => {
        if (lead.status === "New") {
          return count + 1;
        }
        return count;
      }, 0);

      // Calculate lead qualification rate, based on closed leads, qualified leads are converted to closed automatically.
      const qualifiedLeadsCount = leads.reduce((count, lead) => {
        if (lead.status === statusType.QUALIFIED || lead.status === statusType.CLOSED) {
          return count + 1;
        }
        return count;
      }, 0);
      const totalLeadsCount = leads.length;
      const leadQualificationRate =
        totalLeadsCount === 0 ? 0 : qualifiedLeadsCount / totalLeadsCount;

      //total revenue
      const totalLeadPrice = leads.reduce(
        (total, lead) => total + Number(lead.price),
        0
      );

      //avg lead size
      const averageDealSize =
        totalLeadsCount === 0 ? 0 : totalLeadPrice / totalLeadsCount;

      //if search,page,limit,status any data provide then only table section change
      if (
        page != undefined ||
        limit != undefined ||
        search != undefined ||
        status != undefined
      ) {
        if (status !== undefined) {
          leads = leads.filter((lead) => lead.status === status);
        }
        let searchedData: Lead[] = [];
        let skip = 0;

        if (search) {
          skip = 1;
          searchedData = await leads.filter((lead) => {
            if (
              (lead.fullName !== null &&
                lead.fullName
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.countryCode !== null &&
                lead.countryCode
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.phone !== null &&
                lead.phone
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.title !== null &&
                lead.title
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.email !== null &&
                lead.email
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.country !== null &&
                lead.country
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.state !== null &&
                lead.state
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.city !== null &&
                lead.city
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.leadSource !== null &&
                lead.leadSource
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.rating !== null &&
                lead.rating
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.description !== null &&
                lead.description
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (lead.price !== null &&
                lead.price
                  .toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase()))
            ) {
              return true;
            }
          });
        }
        if (searchedData.length === 0 && skip === 0) {
          searchedData = leads;
        }
        const totalFilteredCount = searchedData.length;
        if (page != undefined && limit != undefined) {
          searchedData = searchedData.slice((page - 1) * limit, page * limit);
        }
        const pagination = {
          total: totalFilteredCount,
          page: page,
          limit: limit,
          data: searchedData,
        };

        const datapagination = {
          total_no_of_leads: totalCount,
          lead_percentage_status: countsData,
          lead_count_status: catcountsData,
          leads_with_status_new: newLeadsCount,
          lead_qualific_rate: leadQualificationRate,
          revenue: totalLeadPrice,
          avg_lead_size: averageDealSize,
          lead_data: pagination,
        } as finalLeadPaginationObjectSchemaType;

        return datapagination;
      }

      const data = {
        total_no_of_leads: totalCount,
        lead_percentage_status: countsData,
        lead_count_status: catcountsData,
        leads_with_status_new: newLeadsCount,
        lead_qualific_rate: leadQualificationRate,
        revenue: totalLeadPrice,
        avg_lead_size: averageDealSize,
        lead_data: leads,
      } as finalLeadObjectSchemaType;

      return data;
    } catch (error) {
      return;
    }
  }
  // Function to filter leads based on date range
  filterLeadsByDateRange(
    leads: Lead[],
    startDate: Date,
    endDate: Date
  ): Lead[] {
    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);
    formattedEndDate.setDate(formattedEndDate.getDate() + 1);
    formattedEndDate.setHours(0, 0, 0, 0);
    return leads.filter((lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= formattedStartDate && leadDate <= formattedEndDate;
    });
  }

  filterLeadsByPrice(
    leads: Lead[],
    revenueRange: RevenueRangeParamsType
  ): Lead[] {
    const { startPrice, endPrice } = revenueRange;
    if (
      startPrice &&
      startPrice !== undefined &&
      endPrice &&
      endPrice !== undefined
    ) {
      return leads?.filter((lead) => {
        const price = parseFloat(lead.price);
        return price >= parseFloat(startPrice) && price <= parseFloat(endPrice);
      });
    }
    return leads;
  }
  async getOpportunityDashboardData(
    ownerId: string,
    role: Role[],
    currency: string,
    leadSource: string[] | undefined,
    salesPerson: string | undefined,
    dateRange: RangeDateType,
    page: number | undefined,
    limit: number | undefined,
    search: string | undefined,
    stageFilter: string | undefined,
    revenueRange: RevenueRangeParamsType,
    wonReason: string[],
    lostReason: string[],
    organizationId: string | null
  ) {
    try {
      const leadSourceArray: string[] = [];
      if (leadSource) {
        for (let i = 0; i < leadSource.length; i++) {
          leadSourceArray.push(encryption(leadSource[i]));
        }
      }

      let opportunityRepo;
      if (role.length === 1 && role[0].roleName === roleNames.SALESPERSON) {
        opportunityRepo = await AppDataSource.getRepository(Oppurtunity)
          .createQueryBuilder("oppurtunity")
          .leftJoinAndSelect("oppurtunity.company", "account")
          .leftJoinAndSelect("oppurtunity.contact", "contact")
          .leftJoinAndSelect("oppurtunity.Lead", "lead")
          .leftJoinAndSelect("oppurtunity.owner", "user")
          .where("oppurtunity.ownerId=:ownerId", { ownerId: ownerId })
          .andWhere("oppurtunity.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      } else {
        opportunityRepo = await AppDataSource.getRepository(Oppurtunity)
          .createQueryBuilder("oppurtunity")
          .leftJoinAndSelect("oppurtunity.company", "account")
          .leftJoinAndSelect("oppurtunity.contact", "contact")
          .leftJoinAndSelect("oppurtunity.Lead", "lead")
          .leftJoinAndSelect("oppurtunity.owner", "user")
          .where("oppurtunity.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      }

      if (leadSource && leadSource.length > 0) {
        opportunityRepo.andWhere("lead.leadSource IN (:leadSource)", {
          leadSource: leadSourceArray,
        });
      }

      if (currency) {
        opportunityRepo.andWhere("oppurtunity.currency IN (:currency)", {
          currency: currency,
        });
      }

      if (stageFilter) {
        opportunityRepo.andWhere("oppurtunity.stage LIKE :state", {
          state: `%${stageFilter}%`,
        });
      }

      if (wonReason && wonReason.length > 0) {
        opportunityRepo.andWhere("oppurtunity.wonReason IN (:wonReason)", {
          wonReason: wonReason,
        });
      }

      if (lostReason && lostReason.length > 0) {
        opportunityRepo.andWhere("oppurtunity.lostReason IN (:lostReason)", {
          lostReason: lostReason,
        });
      }

      opportunityRepo
        .andWhere("oppurtunity.status = :status", { status: "Active" }) //only active data show on whole dashboard
        .orderBy("oppurtunity.updatedAt", "DESC");

      let opportunities = await opportunityRepo.getMany();

      for (let opportunity of opportunities) {
        opportunity = await opportunityDecryption(opportunity);
        opportunity.company = await accountDecryption(opportunity.company);
        opportunity.contact = await contactDecryption(opportunity.contact);
        opportunity.Lead = await leadDecryption(opportunity.Lead);
        opportunity.owner = await userDecryption(opportunity.owner);
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          opportunities = this.filterOpportunityByDateRange(
            opportunities,
            dateRange.startDate,
            dateRange.endDate
          );
        }
      }

      if (revenueRange) {
        if (revenueRange.startPrice && revenueRange.endPrice) {
          opportunities = await this.filterOpportunitiesByEstimatedRevenue(
            opportunities,
            revenueRange
          );
        }
      }

      //chart percentage count
      const allCategories = [
        stageEnum.DOCUMENT_COLLECTION,
        stageEnum.PROPOSAL_PREPARATION,
        stageEnum.LOGIN_DESK,
        stageEnum.QUERY,
        stageEnum.QUERY_RESOLUTION,
        stageEnum.APPROVED,
        stageEnum.DISBURSED,
        stageEnum.WON,
        stageEnum.LOST,
      ];
      const countsMap = new Map<string, number>();
      allCategories.forEach((category) => {
        countsMap.set(category, 0);
      });

      opportunities.forEach((oppurtunity) => {
        const stage = oppurtunity.stage;
        if (countsMap.has(stage)) {
          countsMap.set(stage, countsMap.get(stage)! + 1);
        } else {
          countsMap.set(stage, 1);
        }
      });

      let counts = Array.from(countsMap, ([stage, count]) => ({
        stage,
        count,
      }));

      const totalCount = counts.reduce((total, { count }) => total + count, 0);

      const countsData = counts.map(({ stage, count }) => ({
        stage,
        percentage:
          totalCount !== 0 ? ((count / totalCount) * 100).toFixed(2) : 0, // Check if totalCount is 0
      })) as stagedataType[];

      //chart category count
      const countsMap2 = new Map<string, number>();
      allCategories.forEach((category) => {
        countsMap2.set(category, 0);
      });

      let catcountsData: { stage: string; count: number }[] = [];

      opportunities.forEach((opportunity) => {
        const stage = opportunity.stage;
        if (countsMap2.has(stage)) {
          countsMap2.set(stage, countsMap2.get(stage)! + 1);
        } else {
          countsMap2.set(stage, 1);
        }
      });
      catcountsData = Array.from(countsMap2, ([stage, count]) => ({
        stage,
        count,
      })) as categoryStageOpportunityDataType[];

      let monthlyRevenue: { [monthName: string]: number } = {};
      const currentYear = new Date().getFullYear();

      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];

      opportunities.forEach((opportunity) => {
        // Check if estimatedCloseDate is defined and is a valid Date object
        if (
          opportunity.estimatedCloseDate instanceof Date &&
          !isNaN(opportunity.estimatedCloseDate.getTime())
        ) {
          // Extract year from the estimatedCloseDate
          const opportunityYear = opportunity.estimatedCloseDate.getFullYear();

          // Check if the opportunity's year matches the current year
          if (opportunityYear === currentYear) {
            // Extract month from the estimatedCloseDate
            const monthIndex = opportunity.estimatedCloseDate.getMonth();
            const monthName = monthNames[monthIndex];
            const probability = parseInt(opportunity.probability, 10);
            // Check if estimatedRevenue is defined and not null
            if (
              opportunity.estimatedRevenue !== null &&
              opportunity.estimatedRevenue !== undefined &&
              !isNaN(probability)
            ) {
              // Parse and add estimatedRevenue to the corresponding month
              const revenue =
                (parseInt(opportunity.estimatedRevenue) * probability) / 100;
              if (!isNaN(revenue)) {
                if (!monthlyRevenue[monthName]) {
                  monthlyRevenue[monthName] = revenue;
                } else {
                  monthlyRevenue[monthName] += revenue;
                }
              }
            }
          }
        }
      });

      //total Opportunity count
      const totalOpportunityCount = opportunities.length;

      //total Opportunity closed count
      let totalOpportunityClosedCount = 0;
      for (const opportunity of opportunities) {
        if (opportunity.stage == "Won" || opportunity.stage == "Lost") {
          totalOpportunityClosedCount++;
        }
      }

      let totalEstimatedRevenue = 0;
      for (const opportunity of opportunities) {
        const probability = parseInt(opportunity.probability, 10);
        const estimatedRevenue = parseFloat(opportunity.estimatedRevenue);

        if (!isNaN(probability) && !isNaN(estimatedRevenue)) {
          totalEstimatedRevenue += (estimatedRevenue * probability) / 100;
        }
      }
      const averageOpportunityDealSize =
        totalOpportunityCount > 0
          ? totalEstimatedRevenue / totalOpportunityCount
          : 0;

      //if search,page,limit,status any data provide then only table section change
      if (
        page != undefined ||
        limit != undefined ||
        search != undefined ||
        stageFilter != undefined ||
        stageFilter != ""
      ) {
        if (stageFilter !== undefined && stageFilter != "") {
          opportunities = opportunities.filter(
            (opportunity) => opportunity.stage === stageFilter
          );
        }
        let searchedData: Oppurtunity[] = [];
        let skip = 0;
        if (search) {
          skip = 1;
          searchedData = opportunities.filter((opportunity) => {
            if (
              (opportunity?.title !== null &&
                opportunity?.title
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.currency !== null &&
                opportunity?.currency
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.purchaseTimeFrame !== null &&
                opportunity?.purchaseTimeFrame
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.purchaseProcess !== null &&
                opportunity?.purchaseProcess
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.forecastCategory !== null &&
                opportunity?.forecastCategory
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.estimatedRevenue !== null &&
                opportunity?.estimatedRevenue
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.actualRevenue !== null &&
                opportunity?.actualRevenue
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.probability !== null &&
                opportunity?.probability
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.description !== null &&
                opportunity?.description
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.currentNeed !== null &&
                opportunity?.currentNeed
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.proposedSolution !== null &&
                opportunity?.proposedSolution
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.stage !== null &&
                opportunity?.stage
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.status !== null &&
                opportunity?.status
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.wonReason !== null &&
                opportunity?.wonReason
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.lostReason !== null &&
                opportunity?.lostReason
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.wonLostDescription !== null &&
                opportunity?.wonLostDescription
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.contact?.fullName !== null &&
                opportunity?.contact?.fullName
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.owner?.firstName !== null &&
                opportunity?.owner?.firstName
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.owner?.lastName !== null &&
                opportunity?.owner?.lastName
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (opportunity?.priority !== null &&
                opportunity?.priority
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase()))
            ) {
              return true;
            }
          });
        }

        if (salesPerson) {
          let firstName = "";
          let lastName = "";
          if (salesPerson) {
            const nameParts: string[] = salesPerson.split(" ");
            firstName = nameParts[0];
            lastName = nameParts[1];
          }
          skip = 1;
          searchedData = await opportunities.filter((opportunity) => {
            const matchSalesPerson =
              !salesPerson ||
              opportunity?.owner?.firstName
                ?.toLowerCase()
                .includes(firstName?.toLowerCase()) ||
              opportunity?.owner?.lastName
                ?.toLowerCase()
                .includes(lastName?.toLowerCase());
            return matchSalesPerson;
          });
        }

        if (searchedData.length === 0 && skip === 0) {
          searchedData = opportunities;
        }
        const totalFilteredCount = searchedData.length;
        if (page != undefined && limit != undefined) {
          searchedData = searchedData.slice((page - 1) * limit, page * limit);
        }

        const pagination = {
          total: totalFilteredCount,
          page: page,
          limit: limit,
          data: searchedData,
        };

        const datapagination = {
          opportunity_percentage_stage: countsData,
          opportunity_count_stage: catcountsData,
          opportunity_est_revenue_monthwise: monthlyRevenue,
          total_opportunity_count: totalOpportunityCount,
          total_closed_opportunity_count: totalOpportunityClosedCount,
          avg_opportunity_size: averageOpportunityDealSize,
          est_opportunity_revenue: totalEstimatedRevenue,
          opportunity_data: pagination,
        } as finalOpportunityPaginationObjectSchemaType;

        return datapagination;
      }

      const data = {
        opportunity_percentage_stage: countsData,
        opportunity_count_stage: catcountsData,
        total_opportunity_count: totalOpportunityCount,
        total_closed_opportunity_count: totalOpportunityClosedCount,
        avg_opportunity_size: averageOpportunityDealSize,
        est_opportunity_revenue: totalEstimatedRevenue,
        opportunity_data: opportunities,
      } as finalOpportunityObjectSchemaType;

      return data;
    } catch (error) {
      return;
    }
  }

  // Function to filter opportunty based on date range

  filterOpportunityByDateRange(
    opportunities: Oppurtunity[],
    startDate: Date,
    endDate: Date
  ): Oppurtunity[] {
    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);
    formattedEndDate.setDate(formattedEndDate.getDate() + 1);
    formattedEndDate.setHours(0, 0, 0, 0);
    return opportunities.filter((opportunity) => {
      const opportunityDate = new Date(opportunity.createdAt);
      return (
        opportunityDate >= formattedStartDate &&
        opportunityDate <= formattedEndDate
      );
    });
  }

  filterOpportunitiesByEstimatedRevenue(
    opportunities: Oppurtunity[],
    revenueRange: RevenueRangeParamsType
  ): Oppurtunity[] {
    const { startPrice, endPrice } = revenueRange;
    if (
      startPrice &&
      startPrice !== undefined &&
      endPrice &&
      endPrice !== undefined
    ) {
      return opportunities?.filter((opportunity) => {
        const estimatedRevenue = parseFloat(opportunity.estimatedRevenue);
        return (
          estimatedRevenue >= parseFloat(startPrice) &&
          estimatedRevenue <= parseFloat(endPrice)
        );
      });
    }
    return opportunities;
  }

  async getActivityDashboardData(
    ownerId: string,
    role: Role[],
    activityStatus: string[] | undefined,
    activityPriority: string[] | undefined,
    activityType: string[] | undefined,
    dateRange: RangeDateType,
    page: number | undefined,
    limit: number | undefined,
    search: string | undefined,
    organizationId: string | null
  ) {
    try {
      let activityRepo;
      if (role.length === 1 && role[0].roleName === roleNames.SALESPERSON) {
        activityRepo = await AppDataSource.getRepository(Activity)
          .createQueryBuilder("Activity")
          .leftJoinAndSelect("Activity.company", "account")
          .leftJoinAndSelect("Activity.contact", "contact")
          .leftJoinAndSelect("Activity.lead", "lead")
          .leftJoinAndSelect("Activity.opportunity", "oppurtunity")
          .leftJoinAndSelect("Activity.owner", "user")
          .where("Activity.ownerId=:ownerId", { ownerId: ownerId })
          .andWhere("Activity.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      } else {
        activityRepo = await AppDataSource.getRepository(Activity)
          .createQueryBuilder("Activity")
          .leftJoinAndSelect("Activity.company", "account")
          .leftJoinAndSelect("Activity.contact", "contact")
          .leftJoinAndSelect("Activity.lead", "lead")
          .leftJoinAndSelect("Activity.opportunity", "oppurtunity")
          .leftJoinAndSelect("Activity.owner", "user")
          .andWhere("Activity.organizationId=:organizationId", {
            organizationId: organizationId,
          });
      }

      if (activityStatus && activityStatus.length > 0) {
        activityRepo.andWhere("Activity.activityStatus IN (:status)", {
          status: activityStatus,
        });
      }

      if (activityPriority && activityPriority.length > 0) {
        activityRepo.andWhere("Activity.activityPriority IN (:priority)", {
          priority: activityPriority,
        });
      }

      if (activityType && activityType.length > 0) {
        activityRepo.andWhere("Activity.activityType IN (:type)", {
          type: activityType,
        });
      }

      activityRepo.orderBy("Activity.updatedAt", "DESC");
      let activities = await activityRepo.getMany();

      for (let activity of activities) {
        activity =
          activity !== null && activity !== undefined
            ? await activityDecryption(activity)
            : activity;

        if (activity.company) {
          activity.company = await accountDecryption(activity.company);
        }
        if (activity.contact) {
          activity.contact = await contactDecryption(activity.contact);
        }
        if (activity.lead) {
          activity.lead = await leadDecryption(activity.lead);
        }
        if (activity.opportunity) {
          activity.opportunity = await opportunityDecryption(
            activity.opportunity
          );
        }
        if (activity.owner) {
          activity.owner = await userDecryption(activity.owner);
        }
      }

      if (dateRange) {
        if (dateRange.startDate && dateRange.endDate) {
          activities = this.filterActivityByDateRange(
            activities,
            dateRange.startDate,
            dateRange.endDate
          );
        }
      }
      // Initialize an array to store monthly counts
      let monthlyCounts: {
        month: string;
        counts: { Open: number; IN_PROGRESS: number; Completed: number };
      }[] = [];

      // Initialize counts for each status for each month
      for (let i = 0; i < 12; i++) {
        const monthName: string = new Date(0, i).toLocaleString("en-US", {
          month: "long",
        });
        monthlyCounts.push({
          month: monthName,
          counts: {
            Open: 0,
            IN_PROGRESS: 0,
            Completed: 0,
          },
        });
      }

      const currentYear: number = new Date().getFullYear();

      // Count occurrences of each status for each month
      activities.forEach((activity) => {
        // Check if the activity is in the current year
        if (activity.updatedAt.getFullYear() === currentYear) {
          const activityMonth: string = activity.updatedAt.toLocaleString(
            "en-US",
            { month: "long" }
          );
          const status: string = activity.activityStatus; // Use uppercase to match the format in the counts object

          // Find the corresponding month in the array and update the counts
          const monthIndex = monthlyCounts.findIndex(
            (month) => month.month === activityMonth
          );

          if (monthIndex !== -1) {
            switch (status) {
              case "Open":
                monthlyCounts[monthIndex].counts.Open++;
                break;
              case "In Progress":
                monthlyCounts[monthIndex].counts.IN_PROGRESS++;
                break;
              case "Completed":
                monthlyCounts[monthIndex].counts.Completed++;
                break;
              default:
                break;
            }
          }
        }
      });

      // Filter activities where status is 'Completed'
      const completedActivities = activities.filter(
        (activity) => activity.activityStatus === "Completed"
      );
      const completedActivitiesCount = completedActivities.length;

      // Filter activities where status is 'Open'
      const openActivities = activities.filter(
        (activity) => activity.activityStatus === "Open"
      );
      const openActivitiesCount = openActivities.length;

      // Filter activities where status is 'In Progress'
      const inProgressActivities = activities.filter(
        (activity) => activity.activityStatus === "In Progress"
      );
      const inProgressActivitiesCount = inProgressActivities.length;
      //Total no of activites
      const total_no_of_activities = activities.length;

      //status for graph
      const allstatusCategories = ["Open", "In Progress", "Completed"];
      const countsMap = new Map<string, number>();
      allstatusCategories.forEach((statuscategory) => {
        countsMap.set(statuscategory, 0);
      });

      activities.forEach((activity) => {
        const activityStatus = activity.activityStatus;
        if (countsMap.has(activityStatus)) {
          countsMap.set(activityStatus, countsMap.get(activityStatus)! + 1);
        } else {
          countsMap.set(activityStatus, 1);
        }
      });

      let status_count_data = Array.from(
        countsMap,
        ([activityStatus, count]) => ({ activityStatus, count })
      );

      const totalCount = status_count_data.reduce(
        (total, { count }) => total + count,
        0
      );

      const status_percentage_Data = status_count_data.map(
        ({ activityStatus, count }) => ({
          activityStatus,
          percentage:
            totalCount !== 0 ? ((count / totalCount) * 100).toFixed(2) : 0, // Check if totalCount is 0
        })
      ) as activity_status_percentage_dataType[];

      //type for graph
      const allTypeCategories = [
        "Appointment",
        "Task",
        "Phone Call Outbound",
        "Email Outbound",
        "SMS Outbound",
        "Whatsapp Outbound",
      ];
      const countsTypeMap = new Map<string, number>();
      allTypeCategories.forEach((typecategory) => {
        countsTypeMap.set(typecategory, 0);
      });

      activities.forEach((activity) => {
        const activityType = activity.activityType;
        if (countsTypeMap.has(activityType)) {
          countsTypeMap.set(activityType, countsTypeMap.get(activityType)! + 1);
        } else {
          countsTypeMap.set(activityType, 1);
        }
      });

      let type_count_data = Array.from(
        countsTypeMap,
        ([activityType, count]) => ({ activityType, count })
      );

      const type_percentage_Data = type_count_data.map(
        ({ activityType, count }) => ({
          activityType,
          percentage:
            totalCount !== 0 ? ((count / totalCount) * 100).toFixed(2) : 0, // Check if totalCount is 0
        })
      ) as activity_type_percentage_dataType[]; //

      if (page != undefined || limit != undefined || search != undefined) {
        let searchedData: Activity[] = [];
        let skip = 0;
        if (search) {
          skip = 1;
          searchedData = activities.filter((activity) => {
            if (
              (activity?.subject !== null &&
                activity?.subject
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.activityType !== null &&
                activity?.activityType
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.activityStatus !== null &&
                activity?.activityStatus
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.activityPriority !== null &&
                activity?.activityPriority
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.owner?.firstName !== null &&
                activity?.owner?.firstName
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.owner?.lastName !== null &&
                activity?.owner?.lastName
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.startDate !== null &&
                activity?.startDate
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.dueDate !== null &&
                activity?.dueDate
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.actualStartDate !== null &&
                activity?.actualStartDate
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.actualEndDate !== null &&
                activity?.actualEndDate
                  ?.toString()
                  .toLowerCase()
                  .includes(String(search).toLowerCase())) ||
              (activity?.description !== null &&
                activity?.description
                  ?.toLowerCase()
                  .includes(String(search).toLowerCase()))
            ) {
              return true;
            }
          });
        }

        if (searchedData.length === 0 && skip === 0) {
          searchedData = activities;
        }
        const totalFilteredCount = searchedData.length;
        if (page != undefined && limit != undefined) {
          searchedData = searchedData.slice((page - 1) * limit, page * limit);
        }

        const pagination = {
          total: totalFilteredCount,
          page: page,
          limit: limit,
          data: searchedData,
        };

        const datapagination = {
          total_activities: total_no_of_activities,
          total_closed_activities: completedActivitiesCount,
          total_open_activities: openActivitiesCount,
          total_inprogress_activities: inProgressActivitiesCount,
          activity_status_count: status_count_data,
          activity_status_percentage: status_percentage_Data,
          activity_type_count: type_count_data,
          activity_type_percentage: type_percentage_Data,
          activity_status_count_month_wise: monthlyCounts,
          activity_data: pagination,
        };

        return datapagination;
      }
    } catch (error) {
      return;
    }
  }

  filterActivityByDateRange(
    activities: Activity[],
    startDate: Date,
    endDate: Date
  ): Activity[] {
    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);
    formattedEndDate.setDate(formattedEndDate.getDate() + 1);
    formattedEndDate.setHours(0, 0, 0, 0);
    return activities.filter((activity) => {
      const opportunityDate = new Date(activity.createdAt);
      return (
        opportunityDate >= formattedStartDate &&
        opportunityDate <= formattedEndDate
      );
    });
  }
}

export default DashboardServices;
