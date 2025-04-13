export const eventSerialize = (eventName, input) => {
    return {event: eventName, payload: input}
}

export const eventDeserialize = (input) => {
    return input;
}
