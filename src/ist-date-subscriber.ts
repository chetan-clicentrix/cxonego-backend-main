import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import logger from "./common/logger";

@EventSubscriber()
export class ISTDateSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>) {
    this.convertToIST(event.entity);
  }

  beforeUpdate(event: UpdateEvent<any>) {
    this.convertToIST(event.entity);
  }

  afterLoad(entity: any) {
    this.convertToUTC(entity);
  }

  afterLoadMany(entities: any[]) {
    entities.forEach((entity) => this.convertToUTC(entity));
  }

  private convertToIST(entity: any) {
    if (!entity) {
      return;
    }
    const dateFields = Object.keys(entity).filter(
      (key) => entity[key] instanceof Date
    );
    dateFields.forEach((field) => {
      const value = entity[field];
      const offsetInMillis = 5.5 * 60 * 60 * 1000;
      entity[field] = new Date(value.valueOf() + offsetInMillis);
    });
  }
  private convertToUTC(entity: any) {
    if (!entity) {
      return;
    }
    const dateFields = Object.keys(entity).filter((key) => {
      const isDate = entity[key] instanceof Date;
      return isDate;
    });

    dateFields.forEach((field) => {
      const value = entity[field];
      const utcDate = new Date(value.valueOf() - 5.5 * 60 * 60 * 1000);
      entity[field] = utcDate;
    });
  }
}
