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
  AfterLoad,
} from "typeorm";

import { IsEmail, Matches } from "class-validator";
import { Currency, ratingRate, statusType, encryption, decrypt } from "../common/utils";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Account } from "./Account";
import { EncryptionTransformer } from "typeorm-encrypted";
import { Contact } from "./Contact";
import { Activity } from "./Activity";
import { User } from "./User";
import { Note } from "./Note";
import { Organisation } from "./Organisation";
@Entity()
export class Lead extends CustomBaseEntity {

  constructor(payload: Lead) {
    super();
    Object.assign(this, payload);
  }
  @PrimaryColumn()
  leadId: string;

  @Column({
    type: "varchar",
    nullable: false,
  })
  fullName: string;

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
    nullable: true,
  })
  @IsEmail()
  email: string;

  @ManyToOne(() => Account, (Account) => Account.leads, {
    cascade: true,
    // onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: true,
    eager: true
  })
  company?: Account;

  @ManyToOne(() => Contact, (Contact) => Contact.leads, {
    cascade: true,
    // onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: true,
    eager: true
  })
  contact?: Contact;

  @Column({
    type: "varchar",
    default: "India",
    nullable: false,
  })
  country: string;

  @Column({
    default: "Maharashtra",
    nullable: false,
  })
  state: string;

  @Column({
    type: "varchar",
    default: "Pune",
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
    enum: statusType,
    default: statusType.NEW,
  })
  status: statusType;

  @Column({
    nullable: true,
  })
  price: string;

  @Column({
    type: "enum",
    enum: Currency,
    default: Currency.INR
  })
  currency: Currency;

  @OneToMany(() => Activity, Activity => Activity.lead)
  activity: Activity[];

  @ManyToOne(() => User, (User) => User.lead, {
    // onDelete:"CASCADE",
    onUpdate: "CASCADE",
    eager: true
  })
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @OneToMany(() => Note, (Note) => Note.Lead)
  notes: Note[];

  @ManyToOne(() => Organisation, (Organisation) => Organisation.leads, {
    cascade: true,
    // onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: true,
    eager: true
  })
  @JoinColumn({ name: "organizationId" })
  organization: Organisation;

  @Column({
    type: "text",
    nullable: true
  })
  description: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  externalId: string;

  @Column({ nullable: true })
  leadType: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  loanType: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  loanAmount: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  zone: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  village: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  pincode: string;

  @BeforeInsert()
  @BeforeUpdate()
  encrypt() {
    if (this.fullName) this.fullName = encryption(this.fullName);
    if (this.countryCode) this.countryCode = encryption(this.countryCode);
    if (this.phone) this.phone = encryption(this.phone);
    if (this.country) this.country = encryption(this.country);
    if (this.leadSource) this.leadSource = encryption(this.leadSource);
    if (this.email) this.email = encryption(this.email);
    if (this.state) this.state = encryption(this.state);
    if (this.city) this.city = encryption(this.city);
    if (this.description) this.description = encryption(this.description);
    if (this.price) this.price = encryption(this.price);
    if (this.loanType) this.loanType = encryption(this.loanType);
    if (this.loanAmount) this.loanAmount = encryption(this.loanAmount);
    if (this.zone) this.zone = encryption(this.zone);
    if (this.village) this.village = encryption(this.village);
    if (this.pincode) this.pincode = encryption(this.pincode);
  }

  @AfterInsert()
  auditHandlerAfterInsert() {
    console.log(this)

  }
  @AfterUpdate()
  auditHandlerAfterUpdate() {
    console.log(this)
  }

  @AfterLoad()
  decrypt() {
    if (this.fullName) this.fullName = decrypt(this.fullName);
    if (this.countryCode) this.countryCode = decrypt(this.countryCode);
    if (this.phone) this.phone = decrypt(this.phone);
    if (this.country) this.country = decrypt(this.country);
    if (this.leadSource) this.leadSource = decrypt(this.leadSource);
    if (this.email) this.email = decrypt(this.email);
    if (this.state) this.state = decrypt(this.state);
    if (this.city) this.city = decrypt(this.city);
    if (this.description) this.description = decrypt(this.description);
    if (this.price) this.price = decrypt(this.price);
    if (this.loanType) this.loanType = decrypt(this.loanType);
    if (this.loanAmount) this.loanAmount = decrypt(this.loanAmount);
    if (this.zone) this.zone = decrypt(this.zone);
    if (this.village) this.village = decrypt(this.village);
    if (this.pincode) this.pincode = decrypt(this.pincode);
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
