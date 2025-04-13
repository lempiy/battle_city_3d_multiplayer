// binary_heap.js

export class BinaryHeap {
    constructor(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    push(element) {
        // Додаємо елемент в кінець масиву
        this.content.push(element);
        // Дозволяємо йому спливти вгору
        this.bubbleUp(this.content.length - 1);
    }

    pop() {
        // Зберігаємо перший елемент, щоб повернути його пізніше
        const result = this.content[0];
        // Отримуємо останній елемент і видаляємо його з купи
        const end = this.content.pop();
        // Якщо в купі ще є елементи, помістіть останній елемент на початок
        // і дозволимо йому просочитися вниз
        if (this.content.length > 0) {
            this.content[0] = end;
            this.sinkDown(0);
        }
        return result;
    }

    remove(node) {
        const length = this.content.length;
        // Щоб видалити значення, нам потрібно його знайти
        for (let i = 0; i < length; i++) {
            if (this.content[i] !== node) continue;
            // Коли знайдено, замінимо його останнім елементом купи
            const end = this.content.pop();
            // Якщо елемент був останнім, ми закінчили
            if (i === length - 1) break;
            // Інакше, замінимо його останнім елементом і дозволимо йому просочитися вниз
            this.content[i] = end;
            this.bubbleUp(i);
            this.sinkDown(i);
            break;
        }
    }

    size() {
        return this.content.length;
    }

    isEmpty() {
        return this.content.length === 0;
    }

    bubbleUp(n) {
        // Отримуємо елемент, який потрібно перемістити вгору
        const element = this.content[n];
        const score = this.scoreFunction(element);
        // Продовжуємо рухатися вгору, поки не досягнемо кореня або не знайдемо елемент з меншим або рівним значенням
        while (n > 0) {
            // Обчислюємо індекс батьківського елемента
            const parentN = Math.floor((n + 1) / 2) - 1;
            const parent = this.content[parentN];
            // Якщо значення батьківського елемента менше або рівне нашому, ми закінчили
            if (score >= this.scoreFunction(parent)) break;

            // В іншому випадку, міняємо батьківський елемент з поточним і продовжуємо
            this.content[parentN] = element;
            this.content[n] = parent;
            n = parentN;
        }
    }

    sinkDown(n) {
        // Шукаємо місце для елемента
        const length = this.content.length;
        const element = this.content[n];
        const elemScore = this.scoreFunction(element);

        while (true) {
            // Обчислюємо індекси дочірніх елементів
            const child2N = (n + 1) * 2;
            const child1N = child2N - 1;
            // Це використовується для зберігання позиції, якщо ми знайдемо елемент для заміни
            let swap = null;
            let child1Score;
            // Якщо перший дочірній елемент існує (знаходиться в межах купи)
            if (child1N < length) {
                // Шукаємо перший дочірній елемент
                const child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);
                // Якщо значення менше за поточний елемент, нам потрібно поміняти їх місцями
                if (child1Score < elemScore) swap = child1N;
            }
            // Те саме для другого дочірнього елемента
            if (child2N < length) {
                const child2 = this.content[child2N];
                const child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) swap = child2N;
            }

            // Якщо жоден з дочірніх елементів не має меншого значення, ми закінчили
            if (swap === null) break;

            // В іншому випадку, міняємо місцями з дочірнім елементом з меншим значенням і продовжуємо
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
        }
    }
}