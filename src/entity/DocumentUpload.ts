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
import { UploadSession } from "./UploadSession";
import { DocumentRequirement } from "./DocumentRequirement";
import { UploadChunk } from "./UploadChunk";
import { SharePointDocument } from "./SharePointDocument";

export enum UploadStatus {
    PENDING = "PENDING",
    UPLOADING = "UPLOADING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
}

@Entity()
@Index(["uploadSessionId", "uploadStatus", "updatedAt"])
@Index(["opportunityId", "uploadStatus"])
@Index(["uploadSessionId", "requirementId"], { unique: true })
export class DocumentUpload extends CustomBaseEntity {
    constructor(payload: DocumentUpload) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    uploadId: string;

    @Column()
    uploadSessionId: string;

    @ManyToOne(() => UploadSession, (session) => session.uploads, {
        nullable: false,
        eager: true,
    })
    @JoinColumn({ name: "uploadSessionId" })
    uploadSession: UploadSession;

    @Column({ nullable: true })
    requirementId: string;

    @ManyToOne(() => DocumentRequirement, { nullable: true, eager: true })
    @JoinColumn({ name: "requirementId" })
    requirement: DocumentRequirement;

    @Column()
    opportunityId: string;

    @Column({ length: 500 })
    fileName: string;

    @Column({ type: "bigint" })
    fileSize: number;

    @Column({ length: 100 })
    fileType: string;

    @Column({ type: "int" })
    totalChunks: number;

    @Column({ type: "int", default: 0 })
    uploadedChunks: number;

    @Column({
        type: "enum",
        enum: UploadStatus,
        default: UploadStatus.PENDING,
    })
    uploadStatus: UploadStatus;

    @Column({ type: "text", nullable: true })
    tempFilePath: string;

    @Column({ nullable: true, length: 64 })
    fileChecksum: string;

    @Column({ type: "int", default: 0 })
    retryCount: number;

    @Column({ type: "text", nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    sharepointDocumentId: string;

    @ManyToOne(() => SharePointDocument, { nullable: true })
    @JoinColumn({ name: "sharepointDocumentId" })
    sharepointDocument: SharePointDocument;

    @OneToMany(() => UploadChunk, (chunk) => chunk.upload, {
        cascade: ["remove"],
    })
    chunks: UploadChunk[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
