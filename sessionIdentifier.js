const SESSION_STORAGE_KEY = 'SessionIdentifier';
const SESSION_TIMEOUT = 30000; // ms

class SessionIdentifier extends EventTarget {
	constructor() {
		super();
		this.#startBroadcast();
	}

	// { identifier: , timeStamp: }
	get currentIdentifier() {
		return this.#currentIdentifier;
	}

	#currentIdentifier = this.#getInitialIdentifier();

	#getInitialIdentifier() {
		let id = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
		if (!id) {
			id = this.#createRandomIdentifier();
			sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(id));
		}
		this.#updateIdentifier(id);
		return id;
	}

	#createRandomIdentifier() {
		return {
			identifier: `${SESSION_STORAGE_KEY}.${self.crypto.randomUUID()}`,
			timeStamp: performance.now(),
		}
	}

	#startBroadcast() {
		// TODO:
		// Send a message and start to listen to new messages.
		// If the new message timeSTamp

	}

	#updateIdentifier(id) {
		this.dispatchEvent(new CustomEvent('SessionIdentifier', {
			detail: {
				...id
			}
		}));
	}

}