import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Oppurtunity } from "./Oppurtunity";
import { Organisation } from "./Organisation";
import { DocumentUpload } from "./DocumentUpload";

export enum UploadSessionStatus {
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    COMPLETED = "COMPLETED",
}

@Entity()
@Index(["sessionToken", "status"])
@Index(["opportunityId", "status", "createdAt"])
export class UploadSession extends CustomBaseEntity {
    constructor(payload: UploadSession) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    uploadSessionId: string;

    @Column({ unique: true, length: 64 })
    sessionToken: string;

    @Column()
    opportunityId: string;

    @ManyToOne(() => Oppurtunity, { nullable: false, eager: true })
    @JoinColumn({ name: "opportunityId" })
    opportunity: Oppurtunity;

    @Column({
        type: "enum",
        enum: UploadSessionStatus,
        default: UploadSessionStatus.ACTIVE,
    })
    status: UploadSessionStatus;

    @Column({ type: "datetime" })
    expiresAt: Date;

    @Column({ nullable: true, length: 45 })
    ipAddress: string;

    @Column({ type: "text", nullable: true })
    userAgent: string;

    @ManyToOne(() => Organisation, { nullable: false, eager: true })
    @JoinColumn({ name: "organisationId" })
    organization: Organisation;

    @OneToMany(() => DocumentUpload, (upload) => upload.uploadSession, {
        cascade: ["remove"],
    })
    uploads: DocumentUpload[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
