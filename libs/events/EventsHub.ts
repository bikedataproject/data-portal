export class EventsHub<T> {
    _handlers: { name: string, callbacks: ((args: T) => void)[] }[] = [];

    on(name: string | string[], callback: ((args: T) => void)) {
        if (typeof name === "string") {
            let registered = this._handlers.find(
                h => h.name === name);        
            if (!registered) {
                registered = {
                    name: name,
                    callbacks: []
                };
                this._handlers.push(registered);
            }
    
            registered.callbacks.push(callback);
        } else {
            name.forEach(n => {
                this.on(n, callback);
            })
        }
    }

    trigger(name: string, args: T) {
        let registered = this._handlers.find(
            h => h.name === name);       
        if (registered) {
            registered.callbacks.forEach(h => {
                h(args);
            });
        }
    }
}