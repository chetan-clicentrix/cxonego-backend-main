import { Entity, PrimaryGeneratedColumn, Column, OneToMany, PrimaryColumn, JoinColumn, BeforeInsert, BeforeUpdate, ManyToOne } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Lead } from "./Lead";
import { SocialMedia } from "./SocialMedia";
import { Contact } from "./Contact";
import { status, statusType } from "../common/utils";
import { encryption } from "../common/utils";
import { Oppurtunity } from "./Oppurtunity";
import { Activity } from "./Activity";
import { User } from "./User";
import { Note } from "./Note";
import { Organisation } from "./Organisation";
import { Case } from "./Case";
@Entity()
export class Account extends CustomBaseEntity {
    constructor(payload: Account) {
        super();
        Object.assign(this, { ...payload });
    }
    @PrimaryColumn()
    accountId: string;

    @Column({
        // unique:true,
        nullable: false
    })
    accountName: string;

    @Column({
        type: "text",
        default: null
    })
    description: string;

    @OneToMany(() => SocialMedia, SocialMedia => SocialMedia.account)
    socialMediaLink: SocialMedia[];

    @Column({ nullable: false })
    country: string;

    @Column({ nullable: false })
    state: string;

    @Column({ nullable: false })
    city: string;

    @Column({ default: null })
    companySize: string;

    @Column({ default: null })
    website: string;

    @Column({ nullable: false })
    industry: string;

    @Column({ nullable: false })
    businessType: string;

    @Column({ default: null })
    CurrencyCode: string;

    @Column({ default: null })
    annualRevenue: string;

    @Column({
        type: "text",
        nullable: false
    })
    address: string;

    @Column({
        type: "text",
        default: null
    })
    area: string;

    @OneToMany(() => Lead, Lead => Lead.company)
    leads: Lead[];

    @Column({
        type: "enum",
        enum: status,
        default: status.ACTIVE
    })
    status: status;

    @Column({ default: null })
    email: string;

    @Column({ default: null })
    phone: string;

    @Column({ default: null })
    countryCode: string;

    @OneToMany(() => Contact, contact => contact.company, {

    })
    contacts: Contact[];

    @OneToMany(() => Oppurtunity, Oppurtunity => Oppurtunity.company)
    oppurtunities: Oppurtunity[];

    @OneToMany(() => Activity, Activity => Activity.company)
    activity: Activity[];

    @ManyToOne(() => User, (User) => User.company, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @OneToMany(() => Note, (Note) => Note.company)
    notes: Note[];

    @OneToMany(() => Case, (caseItem) => caseItem.account)
    cases: Case[];

    @ManyToOne(() => Organisation, (Organisation) => Organisation.companys, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.accountName) this.accountName = encryption(this.accountName);
        if (this.industry) this.industry = encryption(this.industry);
        if (this.state) this.state = encryption(this.state);
        if (this.city) this.city = encryption(this.city);
        if (this.countryCode) this.countryCode = this.countryCode;
        if (this.phone) this.phone = this.phone
        if (this.companySize) this.companySize = encryption(this.companySize);
        if (this.description) this.description = encryption(this.description);
        if (this.website) this.website = encryption(this.website);
        if (this.businessType) this.businessType = encryption(this.businessType);
        if (this.CurrencyCode) this.CurrencyCode = encryption(this.CurrencyCode);
        if (this.annualRevenue) this.annualRevenue = encryption(this.annualRevenue);
        if (this.address) this.address = encryption(this.address);
        if (this.area) this.area = encryption(this.area);
        if (this.country) this.country = encryption(this.country);
        if (this.email) this.email = encryption(this.email);
        if (this.countryCode) this.countryCode = encryption(this.countryCode);
        if (this.phone) this.phone = encryption(this.phone);
    }
}