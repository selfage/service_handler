import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";

export interface MySession {
  sessionId?: string;
  userId?: string;
}

export let MY_SESSION: MessageDescriptor<MySession> = {
  name: "MySession",
  fields: [
    {
      name: "sessionId",
      index: 1,
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: "userId",
      index: 2,
      primitiveType: PrimitiveType.STRING,
    },
  ],
};
