import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { v4 } from "uuid";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { User } from "./User";
import { Account } from "./Account";
import { Contact } from "./Contact";
import { Lead } from "./Lead";
import { Oppurtunity } from "./Oppurtunity";
import { Activity } from "./Activity";
import { Note } from "./Note";
import { Refer } from "./Refer";
import { Subscription } from "./Subscription";
import { Payment } from "./Payment";
import { Case } from "./Case";
import { Technician } from "./Technician";
import { TicketAssignment } from "./TicketAssignment";
import { TicketStatusHistory } from "./TicketStatusHistory";
import { LeadRoutingConfig } from "./LeadRoutingConfig";
@Entity()
export class Organisation extends CustomBaseEntity {
  constructor(payload: Organisation) {
    super();
    Object.assign(this, { ...payload });
  }
  @PrimaryGeneratedColumn("uuid")
  organisationId: string;
  @Column({
    nullable: false,
  })
  industry: string;
  @Column({
    // unique: true,
    nullable: false,
  })
  name: string;
  @Column({
    nullable: true,
  })
  companyToken: string;

  @Column({
    nullable: true,
  })
  contactToken: string;

  @Column({
    length: 8000,
    nullable: true,
  })
  address: string;
  @Column({
    nullable: false,
  })
  country: string;
  @Column({
    nullable: true,
  })
  website: string;
  @Column({
    nullable: true,
  })
  currency: string;
  @Column({
    nullable: false,
  })
  companySize: string;
  @Column({
    nullable: false,
  })
  state: string;
  @Column({
    nullable: false,
  })
  city: string;
  @Column({
    nullable: true,
  })
  phone: string;
  @Column({
    nullable: true,
  })
  email: string;

  @OneToMany(() => User, (User) => User.organisation)
  users: User[];

  @OneToMany(() => Account, (Account) => Account.organization)
  companys: Account[];

  @OneToMany(() => Contact, (Contact) => Contact.organization)
  contacts: Contact[];

  @OneToMany(() => Lead, (Lead) => Lead.organization)
  leads: Lead[];

  @OneToMany(() => Oppurtunity, (Oppurtunity) => Oppurtunity.organization)
  opportunities: Oppurtunity[];

  @OneToMany(() => Activity, (Activity) => Activity.organization)
  activities: Activity[];

  @OneToMany(() => Note, (Note) => Note.organization)
  notes: Note[];

  @OneToMany(() => Refer, (Refer) => Refer.organization)
  refers: Refer[];

  @OneToMany(() => Subscription, (Subscription) => Subscription.orgnization)
  subscriptions: Subscription[];

  @OneToMany(() => Case, (caseItem) => caseItem.organization)
  cases: Case[];

  @OneToMany(() => Technician, (technician) => technician.organization)
  technicians: Technician[];

  @OneToMany(() => TicketAssignment, (assignment) => assignment.organization)
  ticketAssignments: TicketAssignment[];

  @OneToMany(() => TicketStatusHistory, (history) => history.organization)
  ticketStatusHistory: TicketStatusHistory[];

  @OneToMany(() => LeadRoutingConfig, (config) => config.organization)
  leadRoutingConfigs: LeadRoutingConfig[];
}
