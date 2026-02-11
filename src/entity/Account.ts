import { Entity, PrimaryGeneratedColumn, Column, OneToMany, PrimaryColumn, JoinColumn, BeforeInsert, BeforeUpdate, ManyToOne, AfterLoad } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Lead } from "./Lead";
import { SocialMedia } from "./SocialMedia";
import { Contact } from "./Contact";
import { status, statusType } from "../common/utils";
import { encryption, decrypt } from "../common/utils";
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

    @Column({ nullable: false, default: "Maharashtra" })
    state: string;

    @Column({ nullable: false, default: "Pune" })
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
        nullable: true
    })
    address: string;

    @Column({
        type: "text",
        default: null,
        nullable: true
    })
    area: string;

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

    @Column({
        type: "varchar",
        nullable: true
    })
    taluka: string;

    @Column({ default: null, nullable: true })
    clientCategory: string;

    @Column({ default: null, nullable: true })
    segment: string;

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
        if (this.countryCode) this.countryCode = encryption(this.countryCode);
        if (this.phone) this.phone = encryption(this.phone);
        if (this.companySize) this.companySize = encryption(this.companySize);
        if (this.description) this.description = encryption(this.description);
        if (this.website) this.website = encryption(this.website);
        if (this.businessType) this.businessType = encryption(this.businessType);
        if (this.CurrencyCode) this.CurrencyCode = encryption(this.CurrencyCode);
        if (this.annualRevenue) this.annualRevenue = encryption(this.annualRevenue);
        if (this.address) this.address = encryption(this.address);
        if (this.area) this.area = encryption(this.area);
        if (this.zone) this.zone = encryption(this.zone);
        if (this.village) this.village = encryption(this.village);
        if (this.pincode) this.pincode = encryption(this.pincode);
        if (this.taluka) this.taluka = encryption(this.taluka);
        if (this.country) this.country = encryption(this.country);
        if (this.email) this.email = encryption(this.email);
        if (this.clientCategory) this.clientCategory = encryption(this.clientCategory);
        if (this.segment) this.segment = encryption(this.segment);
    }

    @AfterLoad()
    decrypt() {
        if (this.accountName) this.accountName = decrypt(this.accountName);
        if (this.industry) this.industry = decrypt(this.industry);
        if (this.state) this.state = decrypt(this.state);
        if (this.city) this.city = decrypt(this.city);
        if (this.companySize) this.companySize = decrypt(this.companySize);
        if (this.description) this.description = decrypt(this.description);
        if (this.website) this.website = decrypt(this.website);
        if (this.businessType) this.businessType = decrypt(this.businessType);
        if (this.CurrencyCode) this.CurrencyCode = decrypt(this.CurrencyCode);
        if (this.annualRevenue) this.annualRevenue = decrypt(this.annualRevenue);
        if (this.address) this.address = decrypt(this.address);
        if (this.area) this.area = decrypt(this.area);
        if (this.zone) this.zone = decrypt(this.zone);
        if (this.village) this.village = decrypt(this.village);
        if (this.pincode) this.pincode = decrypt(this.pincode);
        if (this.taluka) this.taluka = decrypt(this.taluka);
        if (this.country) this.country = decrypt(this.country);
        if (this.email) this.email = decrypt(this.email);
        if (this.countryCode) this.countryCode = decrypt(this.countryCode);
        if (this.phone) this.phone = decrypt(this.phone);
        if (this.clientCategory) this.clientCategory = decrypt(this.clientCategory);
        if (this.segment) this.segment = decrypt(this.segment);
    }
}