import { ApiProperty } from "@nestjs/swagger";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export abstract class Message<T extends Record<string, any>> {
	@ApiProperty({ example: new Date() })
	timestamp?: Date;

	abstract payload: T;

	constructor(partialData: Partial<Message<T>>) {
		this.timestamp = partialData?.timestamp ?? new Date();
		Object.assign(this, partialData);
	}
}
