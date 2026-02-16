import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    PrimaryColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { User } from "./User";

@Entity("notifications")
@Index(["userId", "isRead"])
@Index(["userId", "createdAt"])
export class Notification extends CustomBaseEntity {
    @PrimaryColumn()
    notificationId: string;

    @Column({ type: "varchar", length: 255 })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId", referencedColumnName: "userId" })
    user: User;

    @Column({ type: "varchar", length: 255 })
    title: string;

    @Column({ type: "text" })
    message: string;

    @Column({
        type: "enum",
        enum: ["lead", "opportunity", "activity", "contact", "account", "system"],
        default: "system",
    })
    type: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    entityId: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    entityType: string;

    @Column({ type: "boolean", default: false })
    @Index()
    isRead: boolean;

    @Column({ type: "varchar", length: 500, nullable: true })
    actionUrl: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    icon: string;

    @Column({ type: "json", nullable: true })
    metadata: any;

    @Column({ type: "timestamp", nullable: true })
    expiresAt: Date;
}
