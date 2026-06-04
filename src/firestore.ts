import type {
  CollectionGroup,
  CollectionReference,
  DocumentData,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore"
import { getScope } from "./scope.js"

export type FirestoreModel = DocumentData
export type FirestoreSchema = Record<string, FirestoreModel>
export type CollectionName<Schema extends FirestoreSchema> = Extract<keyof Schema, string>
export type CollectionModel<
  Schema extends FirestoreSchema,
  Name extends CollectionName<Schema>,
> = Schema[Name]

export interface BoundFirestoreSchema<Schema extends FirestoreSchema> {
  collection<Name extends CollectionName<Schema>>(name: Name): CollectionReference<CollectionModel<Schema, Name>>
  doc<Name extends CollectionName<Schema>>(name: Name, id: string): DocumentReference<CollectionModel<Schema, Name>>
  group<Name extends CollectionName<Schema>>(name: Name): CollectionGroup<CollectionModel<Schema, Name>>
}

export interface FirestoreSchemaApi<Schema extends FirestoreSchema> {
  collection<Name extends CollectionName<Schema>>(
    name: Name,
    db?: Firestore,
  ): CollectionReference<CollectionModel<Schema, Name>>
  doc<Name extends CollectionName<Schema>>(
    name: Name,
    id: string,
    db?: Firestore,
  ): DocumentReference<CollectionModel<Schema, Name>>
  group<Name extends CollectionName<Schema>>(name: Name, db?: Firestore): CollectionGroup<CollectionModel<Schema, Name>>
  from(db: Firestore): BoundFirestoreSchema<Schema>
}

export function collection<Model extends FirestoreModel>(
  collectionPath: string,
  db: Firestore = getScope().db,
): CollectionReference<Model> {
  return db.collection(collectionPath) as CollectionReference<Model>
}

export function doc<Model extends FirestoreModel>(
  documentPath: string,
  db: Firestore = getScope().db,
): DocumentReference<Model> {
  return db.doc(documentPath) as DocumentReference<Model>
}

export function collectionGroup<Model extends FirestoreModel>(
  collectionId: string,
  db: Firestore = getScope().db,
): CollectionGroup<Model> {
  return db.collectionGroup(collectionId) as CollectionGroup<Model>
}

export function defineFirestoreSchema<Schema extends FirestoreSchema>(): FirestoreSchemaApi<Schema> {
  return {
    collection(name, db = getScope().db) {
      return collection(String(name), db)
    },
    doc(name, id, db = getScope().db) {
      return collection<CollectionModel<Schema, typeof name>>(String(name), db).doc(id)
    },
    group(name, db = getScope().db) {
      return collectionGroup(String(name), db)
    },
    from(db) {
      return {
        collection(name) {
          return collection(String(name), db)
        },
        doc(name, id) {
          return collection<CollectionModel<Schema, typeof name>>(String(name), db).doc(id)
        },
        group(name) {
          return collectionGroup(String(name), db)
        },
      }
    },
  }
}
