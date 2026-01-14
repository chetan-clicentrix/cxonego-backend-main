import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Index,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { DocumentUpload } from "./DocumentUpload";

@Entity()
@Index(["uploadId", "chunkIndex"], { unique: true })
@Index(["uploadId", "uploadedAt"])
export class UploadChunk extends CustomBaseEntity {
    constructor(payload: UploadChunk) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    chunkId: string;

    @Column()
    uploadId: string;

    @ManyToOne(() => DocumentUpload, (upload) => upload.chunks, {
        nullable: false,
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "uploadId" })
    upload: DocumentUpload;

    @Column({ type: "int" })
    chunkIndex: number;

    @Column({ type: "int" })
    chunkSize: number;

    @Column({ length: 64 })
    chunkHash: string;

    @Column({ type: "text", nullable: true })
    storagePath: string;

    @CreateDateColumn()
    uploadedAt: Date;
}
