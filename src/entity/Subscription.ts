import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { paymentStatus, subscriptionStatus } from "../common/utils";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { Plan } from "./Plan";

@Entity()
export class Subscription extends CustomBaseEntity {

  @PrimaryColumn()
  subscriptionId: string;

  @Column({
    type: "datetime",
    nullable: true,
  })
  startDateTime: Date | null;

  @Column({
    type: "datetime",
    nullable: true,
  })
  endDateTime: Date | null;

  @Column({
    type: "datetime",
    nullable: true,
  })
  purchaseDateTime: Date;

  @Column({
    type: "datetime",
    nullable: true,
  })
  cancellationDateTime: Date | null;

  @Column({
    type: "enum",
    enum: subscriptionStatus,
    default: subscriptionStatus.SUBSCRIPTION_INACTIVE,
  })
  subscription_status: subscriptionStatus;

  @Column({
    type: "enum",
    enum: paymentStatus,
    default: paymentStatus.PENDING,
  })
  payment_status: paymentStatus;

  @Column({
    nullable: true,
  })
  razorpayPaymentId: string;

  @Column({
    nullable: true,
  })
  customPlanAmount: string;

  @Column({
    nullable: true,
  })
  customAnnualAmount: string;

  @Column({
    nullable: true,
  })
  customNoOfDays: string;

  @Column({
    nullable: true,
  })
  customNoOfUsers: string;

  @Column({
    nullable: true,
  })
  notes: string;

  @ManyToOne(() => Plan, (Plan) => Plan.subscriptions, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: "planId" })
  plan: Plan;

  @ManyToOne(() => User, (User) => User.subscriptions, {
    cascade: true,
    nullable: true,
    eager: true,
    onUpdate: "CASCADE"
  })
  @JoinColumn({ name: "adminId" })
  admin: User;

  @ManyToOne(() => Organisation, (Organisation) => Organisation.subscriptions, {
    cascade: true,
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: "orgnizationId" })
  orgnization?: Organisation;

  @BeforeInsert()
  @BeforeUpdate()
  encrypt() {
    // if(this.amount) this.amount = encryption(this.amount);
    // if(this.maxNoOfUsers) this.maxNoOfUsers = encryption(this.maxNoOfUsers);
    // if(this.planId) this.planId = encryption(this.planId);
  }
}
