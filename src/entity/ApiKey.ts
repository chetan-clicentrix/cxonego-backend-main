import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Organisation } from "./Organisation";
import { User } from "./User";

@Entity("api_keys")
export class ApiKey {
    @PrimaryColumn({ type: "varchar", length: 64 })
    apiKeyId: string;

    @Column({ type: "varchar", length: 255, unique: true })
    apiKey: string; // The actual API key (hashed)

    @Column({ type: "varchar", length: 100 })
    name: string; // Friendly name (e.g., "n8n Automation", "WhatsApp Integration")

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Column({ type: "json", nullable: true })
    permissions: string[]; // Array of allowed permissions/scopes

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy: string; // User ID who created this key

    @Column({ type: "datetime", nullable: true })
    lastUsedAt: Date;

    @Column({ type: "datetime", nullable: true })
    expiresAt: Date; // Optional expiration date (null = never expires)

    @ManyToOne(() => Organisation, { nullable: false })
    @JoinColumn({ name: "organisationId" })
    organisation: Organisation;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @Column({ type: "varchar", length: 50, nullable: true })
    ownerId: string;

    @Column({ type: "varchar", length: 50 })
    organisationId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    constructor(partial?: Partial<ApiKey>) {
        Object.assign(this, partial);
    }
}
