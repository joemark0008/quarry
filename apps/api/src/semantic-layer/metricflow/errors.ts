/** A semantic query could not be compiled (unknown metric, invalid filter, unsupported dialect...). */
export class SemanticLayerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

/** The query itself is invalid (unknown metric or dimension, bad filter or date), not the setup. */
export class SemanticQueryError extends SemanticLayerError {}
