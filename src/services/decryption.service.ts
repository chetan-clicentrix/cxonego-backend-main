import { Contact } from "../entity/Contact";
import { Account } from "../entity/Account";
import { Lead } from "../entity/Lead";
import { decrypt } from "../common/utils";
import { ContactSchemaType } from "../schemas/contact.schema";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Note } from "../entity/Note";
import { Calender } from "../entity/Calender";
import { Refer } from "../entity/Refer";
import { Activity } from "../entity/Activity";
import { Organisation } from "../entity/Organisation";
import { CalenderUser } from "../entity/CalenderUser";
import { User } from "../entity/User";
import { Plan } from "../entity/Plan";
import { Subscription } from "../entity/Subscription";
import { CustomPlanRequest } from "../entity/CustomPlanRequest";
import { Document } from "../entity/Document";
import { LeadRoutingConfig } from "../entity/LeadRoutingConfig";

export const accountDecryption = async (company: Account) => {
  if (company?.accountName) company.accountName = decrypt(company.accountName);
  if (company?.country) company.country = decrypt(company.country);
  if (company?.state) company.state = decrypt(company.state);
  if (company?.city) company.city = decrypt(company.city);
  if (company?.companySize) company.companySize = decrypt(company.companySize);
  if (company?.website) company.website = decrypt(company.website);
  if (company?.industry) company.industry = decrypt(company.industry);
  if (company?.businessType)
    company.businessType = decrypt(company.businessType);
  if (company?.CurrencyCode)
    company.CurrencyCode = decrypt(company.CurrencyCode);
  if (company?.annualRevenue)
    company.annualRevenue = decrypt(company.annualRevenue);
  if (company?.email) company.email = decrypt(company.email);
  if (company?.phone) company.phone = decrypt(company.phone);
  if (company?.countryCode) company.countryCode = decrypt(company.countryCode);
  if (company?.address) company.address = decrypt(company.address);
  if (company?.description) company.description = decrypt(company.description);
  if (company?.area) company.area = decrypt(company.area);

  return company;
};

export const leadDecryption = async (lead: Lead) => {
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
  if (lead?.price) lead.price = decrypt(lead.price);
  if (lead?.countryCode) lead.countryCode = decrypt(lead.countryCode);

  return lead;
};

export const contactDecryption = async (contact: Contact) => {
  if (contact?.firstName) contact.firstName = decrypt(contact.firstName);
  if (contact?.lastName) contact.lastName = decrypt(contact.lastName);
  if (contact?.countryCode) contact.countryCode = decrypt(contact.countryCode);
  if (contact?.phone) contact.phone = decrypt(contact.phone);
  if (contact?.area) contact.area = decrypt(contact.area);
  if (contact?.city) contact.city = decrypt(contact.city);
  if (contact?.state) contact.state = decrypt(contact.state);
  if (contact?.country) contact.country = decrypt(contact.country);
  if (contact?.email) contact.email = decrypt(contact.email);
  if (contact?.addressLine) contact.addressLine = decrypt(contact.addressLine);
  if (contact?.industry) contact.industry = decrypt(contact.industry);
  if (contact?.designation) contact.designation = decrypt(contact.designation);
  if (contact?.description) contact.description = decrypt(contact.description);
  if (contact?.social) contact.social = decrypt(contact.social);

  return contact;
};

export const multipleleadsDecryption = async (leads: Array<Lead>) => {
  const leadsArray: Array<Lead> = [];
  for (let lead of leads) {
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
    leadsArray.push(lead);
  }

  return leadsArray;
};

export const contactDecryptionFilter = async (contact: ContactSchemaType) => {
  if (contact?.firstName) contact.firstName = decrypt(contact.firstName);
  if (contact?.lastName) contact.lastName = decrypt(contact.lastName);
  if (contact?.countryCode) contact.countryCode = decrypt(contact.countryCode);
  if (contact?.phone) contact.phone = decrypt(contact.phone);
  if (contact?.area) contact.area = decrypt(contact.area);
  if (contact?.city) contact.city = decrypt(contact.city);
  if (contact?.state) contact.state = decrypt(contact.state);
  if (contact?.country) contact.country = decrypt(contact.country);
  if (contact?.email) contact.email = decrypt(contact.email);
  if (contact?.addressLine) contact.addressLine = decrypt(contact.addressLine);
  if (contact?.industry) contact.industry = decrypt(contact.industry);
  if (contact?.designation) contact.designation = decrypt(contact.designation);
  if (contact?.description) contact.description = decrypt(contact.description);
  if (contact?.social) contact.social = decrypt(contact.social);

  return contact;
};

export const opportunityDecryption = async (opportunity: Oppurtunity) => {
  if (opportunity?.title) opportunity.title = decrypt(opportunity.title);
  if (opportunity?.description)
    opportunity.description = decrypt(opportunity.description);
  if (opportunity?.currentNeed)
    opportunity.currentNeed = decrypt(opportunity.currentNeed);
  if (opportunity?.proposedSolution)
    opportunity.proposedSolution = decrypt(opportunity.proposedSolution);
  if (opportunity?.wonLostDescription)
    opportunity.wonLostDescription = decrypt(opportunity.wonLostDescription);
  if (opportunity?.estimatedRevenue)
    opportunity.estimatedRevenue = decrypt(opportunity.estimatedRevenue);
  if (opportunity?.actualRevenue)
    opportunity.actualRevenue = decrypt(opportunity.actualRevenue);

  return opportunity;
};

// Decrypt LeadRoutingConfig value
export const leadRoutingConfigDecryption = async (config: LeadRoutingConfig) => {
  if (config?.value) config.value = decrypt(config.value);
  return config;
};

export const noteDecryption = async (note: Note) => {
  if (note?.note) note.note = decrypt(note.note);
  if (note?.tags) note.tags = decrypt(note.tags);
  return note;
};

export const calenderDecryption = async (calenderdata: Calender) => {
  if (calenderdata?.title) calenderdata.title = decrypt(calenderdata.title);
  if (calenderdata?.agenda) calenderdata.agenda = decrypt(calenderdata.agenda);
  if (calenderdata?.Notes) calenderdata.Notes = decrypt(calenderdata.Notes);

  return calenderdata;
};

export const calenderUserDecryption = async (
  calenderUsersdata: Array<CalenderUser>
) => {
  const calenderUsersArray: Array<CalenderUser> = [];
  for (let caluser of calenderUsersdata) {
    if (caluser?.firstName) caluser.firstName = decrypt(caluser.firstName);
    if (caluser?.lastName) caluser.lastName = decrypt(caluser.lastName);
    if (caluser?.email) caluser.email = decrypt(caluser.email);
    calenderUsersArray.push(caluser);
  }
  return calenderUsersArray;
};

export const referDecryption = async (referdata: Refer) => {
  if (referdata?.firstName) referdata.firstName = decrypt(referdata.firstName);
  if (referdata?.lastName) referdata.lastName = decrypt(referdata.lastName);
  if (referdata?.phone) referdata.phone = decrypt(referdata.phone);
  if (referdata?.email) referdata.email = decrypt(referdata.email);
  if (referdata?.referBy) referdata.referBy = decrypt(referdata.referBy);
  if (referdata?.company) referdata.company = decrypt(referdata.company);
  if (referdata?.description)
    referdata.description = decrypt(referdata.description);
  if (referdata?.countryCode)
    referdata.countryCode = decrypt(referdata.countryCode);

  return referdata;
};

export const activityDecryption = async (activitydata: Activity) => {
  if (activitydata?.subject)
    activitydata.subject = decrypt(activitydata.subject);
  if (activitydata?.description)
    activitydata.description = decrypt(activitydata.description);
  return activitydata;
};

export const orgnizationDecryption = async (orgnizationdata: Organisation) => {
  if (orgnizationdata?.industry)
    orgnizationdata.industry = decrypt(orgnizationdata.industry);
  if (orgnizationdata?.name)
    orgnizationdata.name = decrypt(orgnizationdata.name);
  if (orgnizationdata?.address)
    orgnizationdata.address = decrypt(orgnizationdata.address);
  if (orgnizationdata?.country)
    orgnizationdata.country = decrypt(orgnizationdata.country);
  if (orgnizationdata?.state)
    orgnizationdata.state = decrypt(orgnizationdata.state);
  if (orgnizationdata?.city)
    orgnizationdata.city = decrypt(orgnizationdata.city);
  if (orgnizationdata?.phone)
    orgnizationdata.phone = decrypt(orgnizationdata.phone);
  if (orgnizationdata?.email)
    orgnizationdata.email = decrypt(orgnizationdata.email);
  if (orgnizationdata?.website)
    orgnizationdata.website = decrypt(orgnizationdata.website);
  if (orgnizationdata?.companySize)
    orgnizationdata.companySize = decrypt(orgnizationdata.companySize);

  return orgnizationdata;
};

export const userDecryption = async (userdata: User) => {
  if (userdata?.email) userdata.email = decrypt(userdata.email);
  if (userdata?.firstName) userdata.firstName = decrypt(userdata.firstName);
  if (userdata?.lastName) userdata.lastName = decrypt(userdata.lastName);
  if (userdata?.countryCode)
    userdata.countryCode = decrypt(userdata.countryCode);
  if (userdata?.phone) userdata.phone = decrypt(userdata.phone);
  if (userdata?.country) userdata.country = decrypt(userdata.country);
  if (userdata?.state) userdata.state = decrypt(userdata.state);
  if (userdata?.city) userdata.city = decrypt(userdata.city);
  if (userdata?.theme) userdata.theme = decrypt(userdata.theme);
  if (userdata?.currency) userdata.currency = decrypt(userdata.currency);
  if (userdata?.industry) userdata.industry = decrypt(userdata.industry);
  if (userdata?.jobtitle) userdata.jobtitle = decrypt(userdata.jobtitle);
  if (userdata?.primaryIntension)
    userdata.primaryIntension = decrypt(userdata.primaryIntension);
  if (userdata?.otp) userdata.otp = decrypt(userdata.otp);

  return userdata;
};

export const planDecryption = async (planData: Plan) => {
  if (planData?.planamount) planData.planamount = decrypt(planData.planamount);
  if (planData?.annualAmount)
    planData.annualAmount = decrypt(planData.annualAmount);
  if (planData?.gst) planData.gst = decrypt(planData.gst);
  if (planData?.description)
    planData.description = decrypt(planData.description);
  if (planData?.planname) planData.planname = decrypt(planData.planname);
  if (planData?.noOfUsers) planData.noOfUsers = decrypt(planData.noOfUsers);
  if (planData?.noOfDays) planData.noOfDays = decrypt(planData.noOfDays);
  if (planData?.features) planData.features = decrypt(planData.features);
  return planData;
};

export const subscriptionDecryption = async (
  subscriptionData: Subscription
) => {
  if (subscriptionData?.subscriptionId)
    subscriptionData.subscriptionId = decrypt(subscriptionData.subscriptionId);
  if (subscriptionData?.razorpayPaymentId)
    subscriptionData.razorpayPaymentId = decrypt(
      subscriptionData.razorpayPaymentId
    );
  if (subscriptionData?.customNoOfDays)
    subscriptionData.customNoOfDays = decrypt(subscriptionData.customNoOfDays);
  if (subscriptionData?.customNoOfUsers)
    subscriptionData.customNoOfUsers = decrypt(
      subscriptionData.customNoOfUsers
    );
  if (subscriptionData?.customPlanAmount)
    subscriptionData.customPlanAmount = decrypt(
      subscriptionData.customPlanAmount
    );
  if (subscriptionData?.customAnnualAmount)
    subscriptionData.customAnnualAmount = decrypt(
      subscriptionData.customAnnualAmount
    );
  if (subscriptionData?.notes)
    subscriptionData.notes = decrypt(subscriptionData.notes);
  return subscriptionData;
};

export const customPlanRequestDecryption = async (
  requestData: CustomPlanRequest
) => {
  if (requestData?.name) requestData.name = decrypt(requestData.name);
  if (requestData?.email) requestData.email = decrypt(requestData.email);
  if (requestData?.phone) requestData.phone = decrypt(requestData.phone);
  if (requestData?.countryCode)
    requestData.countryCode = decrypt(requestData.countryCode);
  if (requestData?.organization)
    requestData.organization = decrypt(requestData.organization);
  if (requestData?.message) requestData.message = decrypt(requestData.message);
  return requestData;
};

export const documentDecryption = async (document: Document) => {
  if (document?.fileName) document.fileName = decrypt(document.fileName);
  if (document?.description) document.description = decrypt(document.description);
  if (document?.customDocumentType) document.customDocumentType = decrypt(document.customDocumentType);
  return document;
};

export const multipleDocumentsDecryption = async (documents: Array<Document>) => {
  if (!documents || documents.length === 0) return documents;

  const documentsArray: Array<Document> = [];
  for (let document of documents) {
    document = await documentDecryption(document);
    documentsArray.push(document);
  }
  return documentsArray;
};
