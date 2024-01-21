import "./App.css";
import { RegistrationForm } from "../components/RegistrationForm";

const sleep = (timeInMs) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs);
    });
};

function* subGenerate() {
    yield { value: 3.1, promise: sleep(1000) };
    yield { value: 3.2 };
}

function* generate() {
    yield { value: 1 };
    yield { value: 2, promise: sleep(1000) };
    yield { value: 3, iterator: subGenerate() };
    yield { value: 4, stop: true };
    yield { value: 5 };
}

class LinkedListItem {
    constructor(value, previous = null) {
        this.value = value;
        this.previous = previous;
    }
}

class LinkedList {
    constructor(last) {
        this.push = this.push.bind(this);
        this.pop = this.pop.bind(this);

        this.last = last;
    }

    push(value) {
        this.last = new LinkedListItem(value, this.last);
    }

    pop() {
        const last = this.last;
        this.last = this.last.previous;
        return last;
    }
}

class Processor {
    constructor(generator) {
        this.continue = this.continue.bind(this);
        this.process = this.process.bind(this);

        this.resolver = null;
        this.iterators = new LinkedList(new LinkedListItem(generator()));
    }

    continue() {
        this.resolver && this.resolver();
    }

    async process() {
        const iterator = this.iterators.last?.value;
        if (!iterator) {
            return;
        }

        let result = iterator.next();
        while (true) {
            if (result.done) {
                this.iterators.pop();
                break;
            }

            const operation = result.value;

            console.log(operation.value);

            if (operation.promise) {
                await operation.promise;
            }

            if (operation.iterator) {
                this.iterators.push(operation.iterator);
                await this.process();
            }

            if (operation.stop) {
                await new Promise((resolve) => {
                    this.resolver = resolve;
                });
            }

            result = iterator.next();
        }
    }
}

// const processor = new Processor(generate);
// processor.process();

// setTimeout(() => processor.continue(), 5000);

export const App = () => {
    return <RegistrationForm />;
};
