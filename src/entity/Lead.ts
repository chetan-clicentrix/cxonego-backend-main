import {
    Entity,
    Column,
    ManyToOne,
    PrimaryColumn,
    BeforeInsert,
    BeforeUpdate,
    OneToMany,
    JoinColumn,
    AfterUpdate,
    AfterInsert,
  } from "typeorm";
  
  import { IsEmail, Matches } from "class-validator";
  import {  Currency, ratingRate, statusType } from "../common/utils";
  import { CustomBaseEntity } from "./CustomBaseEntity";
  import { Account} from "./Account";
  import { EncryptionTransformer} from "typeorm-encrypted";
  import { encryption } from "../common/utils";
  import { Contact } from "./Contact";
  import { Activity } from "./Activity";
  import { User } from "./User";
  import { Note } from "./Note";
import { Organisation } from "./Organisation";
  @Entity()
  export class Lead extends CustomBaseEntity {
   
    constructor(payload: Lead) {
      super();
      Object.assign(this, payload );
    }
    @PrimaryColumn()
    leadId: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    firstName: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    lastName: string;
  
    @Column({
      type: "varchar",
      nullable: true,
    })
    countryCode: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    phone: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    title: string;
  
    @Column({
      type: "varchar",
      nullable: true
    })
    @IsEmail()
    email: string;

  
    @ManyToOne(() => Account, (Account) => Account.leads, {
      cascade: true,
      // onDelete: "CASCADE",
      onUpdate: "CASCADE",
      nullable: true,
      eager:true
    })
    company?: Account;
   
    @ManyToOne(() => Contact, (Contact) => Contact.leads, {
      cascade: true,
      // onDelete: "CASCADE",
      onUpdate: "CASCADE",
      nullable: true,
      eager:true
    })
    contact?: Contact;

    @Column({
      type: "varchar",
      default : "India",
      nullable: false,
    })
    country: string;
  
    @Column({
      nullable: false,
    })
    state: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    city: string;
  
    @Column({
      type: "varchar",
      nullable: false,
    })
    leadSource: string;
    
    @Column({
      type: "enum",
      enum: ratingRate,
      default: ratingRate.COLD,
    })
    rating: ratingRate;
  
    @Column({
      type: "enum",
      enum:statusType,
      default:statusType.NEW,
    })
    status: statusType;   
    
    @Column({
      nullable: true,
    })
    price: string;

    @Column({
      type:"enum",
      enum:Currency,
      default:Currency.INR
    })
    currency:Currency;
    
    @OneToMany(()=>Activity,Activity=>Activity.lead)
    activity:Activity[];

    @ManyToOne(()=>User,(User)=>User.lead,{  
      // onDelete:"CASCADE",
      onUpdate:"CASCADE",   
      eager:true
    })    
    @JoinColumn({ name: "ownerId" })
    owner : User;

    @OneToMany(()=>Note,(Note)=>Note.Lead)
    notes:Note[];

  @ManyToOne(() => Organisation, (Organisation) => Organisation.leads, {
    cascade: true,
    // onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: true,
    eager:true
  })
  @JoinColumn({ name: "organizationId" })
  organization:Organisation;

  @Column({
    type:"text",
    nullable: true
  })
  description:string;

  @Column({
    type: "varchar",
    nullable: true
  })
  externalId: string;

  @Column({ nullable: true })
  leadType: string;

  @BeforeInsert()
  @BeforeUpdate()
  encrypt() {
    if(this.firstName) this.firstName =encryption(this.firstName);
    if(this.lastName) this.lastName =encryption(this.lastName);
    if(this.countryCode) this.countryCode =encryption(this.countryCode);
    if(this.phone) this.phone =encryption(this.phone);
    if(this.country)  this.country =encryption(this.country);
    if(this.leadSource)  this.leadSource =encryption(this.leadSource);
    if(this.email )  this.email =encryption(this.email);
    if(this.state)  this.state =encryption(this.state);
    if(this.city )  this.city =encryption(this.city);
    if(this.description)  this.description =encryption(this.description);
    if(this.price) this.price =encryption(this.price);    
    }

    @AfterInsert()
    auditHandlerAfterInsert(){
      console.log(this)
      
    }
    @AfterUpdate()
    auditHandlerAfterUpdate(){
      console.log(this)
    }
  }
  
/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       required:
 *         - title
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the lead
 *         title:
 *           type: string
 *           description: Title of the lead
 *         status:
 *           type: string
 *           enum: [New, In Progress, Qualified, Closed]
 *           description: Current status of the lead
 *         description:
 *           type: string
 *           description: Detailed description of the lead
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */
  