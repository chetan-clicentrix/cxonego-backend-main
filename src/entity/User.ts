import { IsEmail, Matches } from "class-validator";
// import { CustomBaseEntity } from "./CustomBaseEntity"
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  JoinTable,
  ManyToMany,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  DeleteDateColumn,
} from "typeorm";
import { Account } from "./Account";
import { Role } from "./Role";
import { Organisation } from "./Organisation";
import { MoodImage } from "./MoodImage";
import { Contact } from "./Contact";
import { Lead } from "./Lead";
import { Oppurtunity } from "./Oppurtunity";
import { Activity } from "./Activity";
import { Note } from "./Note";
import { Subscription } from "./Subscription";
import { Document } from "./Document";
import { Case } from "./Case";
import { Technician } from "./Technician";
import { TicketAssignment } from "./TicketAssignment";
import { TicketStatusHistory } from "./TicketStatusHistory";
import { Skill } from "./Skill";

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  userId: string;
  @Column({ unique: true })
  @IsEmail()
  email: string;
  @Column({
    nullable: true,
  })
  firstName: string;
  @Column({
    nullable: true,
  })
  lastName: string;
  @ManyToOne(() => Organisation, (Organisation) => Organisation.users, {
    eager: true,
    // onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: true,
  })
  organisation: Organisation;
  @Column({
    nullable: true,
  })
  countryCode: string;
  @Column({
    nullable: true,
  })
  phone: string;

  @Column({
    nullable: true,
  })
  country: string;

  @Column({
    nullable: true,
  })
  state: string;

  @Column({
    nullable: true,
  })
  city: string;

  @Column({
    nullable: true,
  })
  theme: string;

  @Column({
    nullable: true,
  })
  currency: string;

  @Column({
    nullable: true,
  })
  industry: string;

  @Column({
    nullable: true,
  })
  jobtitle: string;

  @Column({
    nullable: true,
  })
  primaryIntension: string;

  @Column({
    nullable: true,
  })
  fcmWebToken: string;

  @Column({
    nullable: true,
  })
  fcmAndroidToken: string;

  @Column({
    nullable: true,
    default: "No",
  })
  privacy_consent_given: string;

  @Column({
    type: "datetime",
    nullable: true,
  })
  privacy_consent_signed_date: Date;

  @Column({
    nullable: true,
    unique: true,
  })
  otp: string;

  @Column()
  isActive: boolean;

  @Column({
    default: false,
  })
  isBlocked: boolean;

  @Column({
    default: false,
  })
  emailVerified: boolean;

  @Column({
    type: "json",
    nullable: true,
  })
  invitedUsers: {
    id: string | null;
    name: string;
    email: string;
    role: string;
    onboardingStatus: string;
    isBlocked: boolean;
  }[]

  @Column({
    type: "json",
    nullable: true
  })
  googleTokens: {
    refreshToken: string;
    accessToken: string;
    expiryDate: number;
  };

  @ManyToMany(() => Role, (role) => role.users, {
    eager: true,
    cascade: true,
  })
  @JoinTable()
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({
    nullable: true,
  })
  backgroundImageUrl: string;

  @OneToMany(() => Account, (Account) => Account.owner)
  company: Account[];

  @OneToMany(() => Contact, (Contact) => Contact.owner)
  contact: Contact[];

  @OneToMany(() => Lead, (Lead) => Lead.owner)
  lead: Lead[];

  @OneToMany(() => Oppurtunity, (Oppurtunity) => Oppurtunity.owner)
  opportunity: Oppurtunity[];

  @OneToMany(() => Activity, (Activity) => Activity.owner)
  activity: Activity[];

  @OneToOne(() => MoodImage, (MoodImage) => MoodImage.owner)
  mood: MoodImage;

  @OneToMany(() => Note, (Note) => Note.owner)
  notes: Note[];

  @OneToMany(() => Subscription, (Subscription) => Subscription.admin)
  subscriptions: Subscription[];

  @OneToMany(() => Document, (document) => document.uploadedBy)
  documents: Document[];

  @OneToMany(() => Case, (caseItem) => caseItem.createdBy)
  createdCases: Case[];

  @OneToOne(() => Technician, (technician) => technician.user)
  technician: Technician;

  @OneToMany(() => TicketAssignment, (assignment) => assignment.assignedBy)
  ticketAssignments: TicketAssignment[];

  @OneToMany(() => TicketStatusHistory, (history) => history.changedBy)
  ticketStatusChanges: TicketStatusHistory[];

  @OneToMany(() => Skill, (skill) => skill.owner)
  skills: Skill[];
}
