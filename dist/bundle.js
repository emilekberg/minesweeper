(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    var Result;
    (function (Result) {
        Result[Result["ONGOING"] = 0] = "ONGOING";
        Result[Result["LOST"] = 1] = "LOST";
        Result[Result["WON"] = 2] = "WON";
    })(Result || (Result = {}));
    var Result$1 = Result;

    const northWest = Object.freeze({ x: -1, y: -1 });
    const north = Object.freeze({ x: 0, y: -1 });
    const northEast = Object.freeze({ x: 1, y: -1 });
    const west = Object.freeze({ x: -1, y: 0 });
    const east = Object.freeze({ x: 1, y: 0 });
    const southWest = Object.freeze({ x: -1, y: 1 });
    const south = Object.freeze({ x: 0, y: 1 });
    const southEast = Object.freeze({ x: 1, y: 1 });
    /**
     *
     */
    const adjacentPositions = Object.freeze([
        northWest, north, northEast,
        west, east,
        southWest, south, southEast
    ]);

    class Grid {
        /**
         * initializes the grid.
         * Callback is called for each element in the grid.
         * @param width
         * @param height
         * @param callback
         */
        init(width, height, getDataCallback) {
            this.data = [];
            this.width = width;
            this.height = height;
            for (let i = 0; i < width * height; i++) {
                const position = this.getPositionFromIndex(i);
                this.data.push(getDataCallback(i, position));
            }
        }
        get(x, y) {
            const index = this.getIndexFromPosition(x, y);
            return this.getDataFromIndex(index);
        }
        getDataFromIndex(index) {
            return this.data[index];
        }
        /**
         * Returns the index of a 2d array, from the specified x and y paramters.
         * @param x
         * @param y
         * @returns
         */
        getIndexFromPosition(x, y) {
            return y * this.width + x;
        }
        /**
         * gets the position from an index value.
         * @param index
         * @returns
         */
        getPositionFromIndex(index) {
            return {
                x: index % this.width,
                y: Math.floor(index / this.width)
            };
        }
        /**
        * Validates that the provided point is within the broundries
        * of the grid.
        * @param x
        * @param y
        * @returns
        */
        isPointWithinBoundries(x, y) {
            if (x < 0 || x >= this.width)
                return false;
            if (y < 0 || y >= this.height)
                return false;
            return true;
        }
        getAdjacentTilePositions(startX, startY) {
            const result = [];
            for (const adjacent of adjacentPositions) {
                const x = startX + adjacent.x;
                const y = startY + adjacent.y;
                if (!this.isPointWithinBoundries(x, y))
                    continue;
                result.push({ x, y });
            }
            return result;
        }
    }

    var Markers;
    (function (Markers) {
        Markers[Markers["NONE"] = 0] = "NONE";
        Markers[Markers["QUESTION_MARK"] = 1] = "QUESTION_MARK";
        Markers[Markers["FLAG"] = 2] = "FLAG";
    })(Markers || (Markers = {}));
    var Markers$1 = Markers;

    /**
     * Minesweeper game.
     */
    class MineSweeper {
        constructor() {
            this.grid = new Grid();
        }
        /**
         * Initializes a new game.
         * @param width
         * @param height
         * @param numMines
         */
        init(width, height, numMines) {
            this.gameResult = undefined;
            this.generateGrid(width, height);
            this.generateMines(numMines);
            this.generateAdjacentMineNumbers();
        }
        generateGrid(width, height) {
            this.grid.init(width, height, (_, { x, y }) => {
                return {
                    x,
                    y,
                    isMine: false,
                    icon: Markers$1.NONE,
                    numAdjacentMines: 0,
                    isRevealed: false
                };
            });
        }
        generateMines(numberOfMines) {
            this.numberOfMines = numberOfMines;
            // generate unique mines by cloning data 
            // and removing available positions after each generation.
            const availablePositions = this.grid.data.concat();
            for (let i = 0; i < numberOfMines; i++) {
                let index = Math.floor(Math.random() * availablePositions.length);
                this.grid.getDataFromIndex(index).isMine = true;
                availablePositions.splice(index, 1);
            }
        }
        generateAdjacentMineNumbers() {
            for (let i = 0; i < this.grid.width * this.grid.height; i++) {
                if (this.grid.getDataFromIndex(i).isMine)
                    continue;
                const data = this.grid.getDataFromIndex(i);
                const adjacent = this.grid.getAdjacentTilePositions(data.x, data.y);
                data.numAdjacentMines = adjacent.filter(pos => this.grid.get(pos.x, pos.y).isMine).length;
            }
        }
        toggleIcon(x, y) {
            if (!this.grid.isPointWithinBoundries(x, y)) {
                return;
            }
            this.grid.get(x, y).icon = ++this.grid.get(x, y).icon % 3;
        }
        /**
         * Reveals the position.
         * If it's blank, reveal the entire shape.
         * @param x
         * @param y
         * @returns
         */
        reveal(x, y) {
            const data = this.grid.get(x, y);
            if (data.isRevealed) {
                return;
            }
            if (data.isMine) {
                this.revealList(this.grid.data);
                this.gameResult = Result$1.LOST;
                return;
            }
            data.isRevealed = true;
            if (data.numAdjacentMines > 0) {
                this.checkWinCondition();
                // return since we should only reveal single digit here.
                return;
            }
            // if the clicked square is blank, traverse adjacent cells
            // and reveal them.
            const result = [];
            this.getAdjacentWithoutMine(x, y, result);
            this.revealList(result);
            this.checkWinCondition();
        }
        /**
         * Mark all cells in the list as revealed.
         * This means they will be rendered.
         * @param toReveal
         */
        revealList(toReveal) {
            toReveal.forEach(x => x.isRevealed = true);
        }
        checkWinCondition() {
            var unrevealed = this.grid.data.filter(x => !x.isRevealed);
            if (unrevealed.length === this.numberOfMines) {
                this.gameResult = Result$1.WON;
                return true;
            }
            return false;
        }
        /**
         * Traverses adjacent nodes of the specified position.
         * Adds them to the out array if they're not present already
         * and recursivly traverse the array with nodes left.
         * @param x
         * @param y
         * @param out
         */
        getAdjacentWithoutMine(startX, startY, out) {
            const adjacentTiles = this.grid.getAdjacentTilePositions(startX, startY);
            for (const { x, y } of adjacentTiles) {
                const data = this.grid.get(x, y);
                if (data.isMine) {
                    continue;
                }
                if (out.find(pos => pos.x === x && pos.y === y)) {
                    continue;
                }
                out.push(data);
                if (data.numAdjacentMines > 0) {
                    continue;
                }
                this.getAdjacentWithoutMine(x, y, out);
            }
        }
        getData() {
            return this.grid.data;
        }
        hasGameFinished() {
            if (this.gameResult === undefined) {
                return false;
            }
            if (this.gameResult === Result$1.ONGOING) {
                return false;
            }
            return true;
        }
        getGameResult() {
            return this.gameResult;
        }
    }

    /* src/components/faces/flag.svelte generated by Svelte v3.37.0 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-10fxtf1-style";
    	style.textContent = "span.svelte-10fxtf1{font-size:2rem}";
    	append(document.head, style);
    }

    function create_fragment$a(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "🤞";
    			attr(span, "class", "svelte-10fxtf1");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    class Flag extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-10fxtf1-style")) add_css$7();
    		init(this, options, null, create_fragment$a, safe_not_equal, {});
    	}
    }

    /* src/components/faces/questionmark.svelte generated by Svelte v3.37.0 */

    function create_fragment$9(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "❓";
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    class Questionmark extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$9, safe_not_equal, {});
    	}
    }

    /* src/components/faces/front.svelte generated by Svelte v3.37.0 */

    function create_if_block_1$2(ctx) {
    	let flag;
    	let current;
    	flag = new Flag({});

    	return {
    		c() {
    			create_component(flag.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flag, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flag.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flag.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flag, detaching);
    		}
    	};
    }

    // (10:2) {#if cellData.icon === Markers.QUESTION_MARK}
    function create_if_block$2(ctx) {
    	let questionmark;
    	let current;
    	questionmark = new Questionmark({});

    	return {
    		c() {
    			create_component(questionmark.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(questionmark, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(questionmark.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(questionmark.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(questionmark, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block0 = /*cellData*/ ctx[0].icon === Markers$1.FLAG && create_if_block_1$2();
    	let if_block1 = /*cellData*/ ctx[0].icon === Markers$1.QUESTION_MARK && create_if_block$2();

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr(div, "class", "front-face");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*cellData*/ ctx[0].icon === Markers$1.FLAG) {
    				if (if_block0) {
    					if (dirty & /*cellData*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$2();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*cellData*/ ctx[0].icon === Markers$1.QUESTION_MARK) {
    				if (if_block1) {
    					if (dirty & /*cellData*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2();
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	
    	let { cellData } = $$props;

    	$$self.$$set = $$props => {
    		if ("cellData" in $$props) $$invalidate(0, cellData = $$props.cellData);
    	};

    	return [cellData];
    }

    class Front extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, { cellData: 0 });
    	}
    }

    /* src/components/faces/mine.svelte generated by Svelte v3.37.0 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-1fo983k-style";
    	style.textContent = ".mine.svelte-1fo983k{position:relative;font-size:2.5rem;text-align:center}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "💣";
    			attr(span, "class", "mine svelte-1fo983k");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    class Mine extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1fo983k-style")) add_css$6();
    		init(this, options, null, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/components/faces/number.svelte generated by Svelte v3.37.0 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-1unhjw9-style";
    	style.textContent = "span.svelte-1unhjw9{font-family:'Varela Round', sans-serif;font-size:2rem;color:red;text-shadow:0.02em 0 0 #000, 0 -0.02em 0 #000, 0 0.02em 0 #000, -0.02em 0 0 #000}.count-1.svelte-1unhjw9{color:yellow}.count-2.svelte-1unhjw9{color:orange}.count-3.svelte-1unhjw9{color:orangered}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text(/*value*/ ctx[0]);
    			attr(span, "class", span_class_value = "adjacent-count count-" + /*value*/ ctx[0] + " svelte-1unhjw9");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1) set_data(t, /*value*/ ctx[0]);

    			if (dirty & /*value*/ 1 && span_class_value !== (span_class_value = "adjacent-count count-" + /*value*/ ctx[0] + " svelte-1unhjw9")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { value = 0 } = $$props;

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value];
    }

    class Number extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1unhjw9-style")) add_css$5();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { value: 0 });
    	}
    }

    /* src/components/faces/back.svelte generated by Svelte v3.37.0 */

    function create_if_block_1$1(ctx) {
    	let mine;
    	let current;
    	mine = new Mine({});

    	return {
    		c() {
    			create_component(mine.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(mine, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(mine.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(mine.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(mine, detaching);
    		}
    	};
    }

    // (9:2) {#if cellData.numAdjacentMines > 0}
    function create_if_block$1(ctx) {
    	let number;
    	let current;

    	number = new Number({
    			props: {
    				value: /*cellData*/ ctx[0].numAdjacentMines
    			}
    		});

    	return {
    		c() {
    			create_component(number.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(number, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const number_changes = {};
    			if (dirty & /*cellData*/ 1) number_changes.value = /*cellData*/ ctx[0].numAdjacentMines;
    			number.$set(number_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(number.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(number.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(number, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block0 = /*cellData*/ ctx[0].isMine && create_if_block_1$1();
    	let if_block1 = /*cellData*/ ctx[0].numAdjacentMines > 0 && create_if_block$1(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr(div, "class", "back-face");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*cellData*/ ctx[0].isMine) {
    				if (if_block0) {
    					if (dirty & /*cellData*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*cellData*/ ctx[0].numAdjacentMines > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*cellData*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	
    	let { cellData } = $$props;

    	$$self.$$set = $$props => {
    		if ("cellData" in $$props) $$invalidate(0, cellData = $$props.cellData);
    	};

    	return [cellData];
    }

    class Back extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { cellData: 0 });
    	}
    }

    /* src/components/card.svelte generated by Svelte v3.37.0 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-13qzd5e-style";
    	style.textContent = ".card.svelte-13qzd5e{width:4rem;height:4rem;color:white;margin:0.125rem;position:relative;transition:transform 0.25s linear 0s;transform-style:preserve-3d;cursor:pointer;-moz-user-select:none}.full-size.svelte-13qzd5e{height:100%;width:100%}.center-content.svelte-13qzd5e{display:flex;align-items:center;justify-content:center}.rounded.svelte-13qzd5e{border-radius:0.5rem}.front-face.svelte-13qzd5e{position:absolute;backface-visibility:hidden;background-color:rgb(24, 42, 42)}.back-face.svelte-13qzd5e{position:absolute;backface-visibility:hidden;transform:rotateY(180deg);background-color:darkslategray}.is-flipped.svelte-13qzd5e{transform:rotateY(180deg)}";
    	append(document.head, style);
    }

    const get_back_slot_changes = dirty => ({});
    const get_back_slot_context = ctx => ({});
    const get_front_slot_changes = dirty => ({});
    const get_front_slot_context = ctx => ({});

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	const front_slot_template = /*#slots*/ ctx[3].front;
    	const front_slot = create_slot(front_slot_template, ctx, /*$$scope*/ ctx[2], get_front_slot_context);
    	const back_slot_template = /*#slots*/ ctx[3].back;
    	const back_slot = create_slot(back_slot_template, ctx, /*$$scope*/ ctx[2], get_back_slot_context);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			if (front_slot) front_slot.c();
    			t = space();
    			div1 = element("div");
    			if (back_slot) back_slot.c();
    			attr(div0, "class", "front-face full-size center-content rounded svelte-13qzd5e");
    			attr(div1, "class", "back-face full-size center-content rounded svelte-13qzd5e");
    			set_style(div2, "transition", "transform .25s linear " + /*animationDelay*/ ctx[1] + "s");
    			attr(div2, "class", "card svelte-13qzd5e");
    			toggle_class(div2, "is-flipped", /*isFlipped*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);

    			if (front_slot) {
    				front_slot.m(div0, null);
    			}

    			append(div2, t);
    			append(div2, div1);

    			if (back_slot) {
    				back_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div2, "click", /*click_handler*/ ctx[4]),
    					listen(div2, "contextmenu", /*contextmenu_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (front_slot) {
    				if (front_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(front_slot, front_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_front_slot_changes, get_front_slot_context);
    				}
    			}

    			if (back_slot) {
    				if (back_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(back_slot, back_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_back_slot_changes, get_back_slot_context);
    				}
    			}

    			if (!current || dirty & /*animationDelay*/ 2) {
    				set_style(div2, "transition", "transform .25s linear " + /*animationDelay*/ ctx[1] + "s");
    			}

    			if (dirty & /*isFlipped*/ 1) {
    				toggle_class(div2, "is-flipped", /*isFlipped*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(front_slot, local);
    			transition_in(back_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(front_slot, local);
    			transition_out(back_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (front_slot) front_slot.d(detaching);
    			if (back_slot) back_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { isFlipped = false } = $$props;
    	let { animationDelay = 0 } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function contextmenu_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("isFlipped" in $$props) $$invalidate(0, isFlipped = $$props.isFlipped);
    		if ("animationDelay" in $$props) $$invalidate(1, animationDelay = $$props.animationDelay);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [isFlipped, animationDelay, $$scope, slots, click_handler, contextmenu_handler];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-13qzd5e-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { isFlipped: 0, animationDelay: 1 });
    	}
    }

    /* src/components/game.svelte generated by Svelte v3.37.0 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-171wuuy-style";
    	style.textContent = ".game-over.svelte-171wuuy{filter:grayscale(0.75);transition:filter 1s}.row.svelte-171wuuy{display:flex}.scene.svelte-171wuuy{perspective:600px}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (81:10) 
    function create_front_slot(ctx) {
    	let div;
    	let front;
    	let current;

    	front = new Front({
    			props: { cellData: /*cellData*/ ctx[18] }
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(front.$$.fragment);
    			attr(div, "slot", "front");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(front, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const front_changes = {};
    			if (dirty & /*grid*/ 1) front_changes.cellData = /*cellData*/ ctx[18];
    			front.$set(front_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(front.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(front.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(front);
    		}
    	};
    }

    // (84:10) 
    function create_back_slot(ctx) {
    	let div;
    	let back;
    	let current;

    	back = new Back({
    			props: { cellData: /*cellData*/ ctx[18] }
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(back.$$.fragment);
    			attr(div, "slot", "back");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(back, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const back_changes = {};
    			if (dirty & /*grid*/ 1) back_changes.cellData = /*cellData*/ ctx[18];
    			back.$set(back_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(back);
    		}
    	};
    }

    // (71:6) {#each cells as cellData}
    function create_each_block_1(ctx) {
    	let card;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*cellData*/ ctx[18]);
    	}

    	function contextmenu_handler(...args) {
    		return /*contextmenu_handler*/ ctx[10](/*cellData*/ ctx[18], ...args);
    	}

    	card = new Card({
    			props: {
    				isFlipped: /*cellData*/ ctx[18].isRevealed,
    				animationDelay: /*getAnimationDelay*/ ctx[4](/*cellData*/ ctx[18].x, /*cellData*/ ctx[18].y),
    				$$slots: {
    					back: [create_back_slot],
    					front: [create_front_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	card.$on("click", click_handler);
    	card.$on("contextmenu", contextmenu_handler);

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const card_changes = {};
    			if (dirty & /*grid*/ 1) card_changes.isFlipped = /*cellData*/ ctx[18].isRevealed;
    			if (dirty & /*grid*/ 1) card_changes.animationDelay = /*getAnimationDelay*/ ctx[4](/*cellData*/ ctx[18].x, /*cellData*/ ctx[18].y);

    			if (dirty & /*$$scope, grid*/ 2097153) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    // (69:2) {#each grid as cells, row}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value_1 = /*cells*/ ctx[15];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr(div, "class", "row svelte-171wuuy");
    			attr(div, "id", "row-" + /*row*/ ctx[17]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*grid, getAnimationDelay, onClick, onRightClick*/ 29) {
    				each_value_1 = /*cells*/ ctx[15];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div;
    	let current;
    	let each_value = /*grid*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "id", "game-grid");
    			attr(div, "class", "scene svelte-171wuuy");
    			toggle_class(div, "game-over", /*gameFinished*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*grid, getAnimationDelay, onClick, onRightClick*/ 29) {
    				each_value = /*grid*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*gameFinished*/ 2) {
    				toggle_class(div, "game-over", /*gameFinished*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function getGrid(data) {
    	const result = [];

    	data.forEach(cell => {
    		if (result.length === cell.y) {
    			result.push([]);
    		}

    		result[result.length - 1].push(cell);
    	});

    	return result;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	
    	const game = new MineSweeper();
    	let { width = 10 } = $$props;
    	let { height = 10 } = $$props;
    	let { numberOfMines = 10 } = $$props;
    	const dispatch = createEventDispatcher();

    	function gameEnd() {
    		dispatch("end");
    	}

    	game.init(width, height, numberOfMines);
    	let lastClick = { x: 0, y: 0 };
    	let grid = getGrid(game.getData());
    	let gameFinished = false;

    	beforeUpdate(() => {
    		$$invalidate(1, gameFinished = game.hasGameFinished());

    		if (gameFinished) {
    			gameEnd();
    		}
    	});

    	function onClick(x, y) {
    		if (game.hasGameFinished()) {
    			return;
    		}

    		lastClick = { x, y };
    		game.reveal(x, y);
    		$$invalidate(0, grid = getGrid(game.getData()));
    	}

    	function onRightClick(x, y) {
    		if (game.hasGameFinished()) {
    			return;
    		}

    		game.toggleIcon(x, y);
    		$$invalidate(0, grid = getGrid(game.getData()));
    	}

    	function distanceToLastClick(x, y) {
    		const dX = lastClick.x - x;
    		const dY = lastClick.y - y;
    		const len = Math.sqrt(dX * dX + dY * dY);
    		return len;
    	}

    	function getAnimationDelay(x, y) {
    		if (game.hasGameFinished()) {
    			return 0;
    		}

    		const len = distanceToLastClick(x, y);
    		return len * 0.12;
    	}

    	const click_handler = cellData => onClick(cellData.x, cellData.y);

    	const contextmenu_handler = (cellData, e) => {
    		e.preventDefault();
    		onRightClick(cellData.x, cellData.y);
    	};

    	$$self.$$set = $$props => {
    		if ("width" in $$props) $$invalidate(6, width = $$props.width);
    		if ("height" in $$props) $$invalidate(7, height = $$props.height);
    		if ("numberOfMines" in $$props) $$invalidate(8, numberOfMines = $$props.numberOfMines);
    	};

    	return [
    		grid,
    		gameFinished,
    		onClick,
    		onRightClick,
    		getAnimationDelay,
    		game,
    		width,
    		height,
    		numberOfMines,
    		click_handler,
    		contextmenu_handler
    	];
    }

    class Game extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-171wuuy-style")) add_css$3();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			game: 5,
    			width: 6,
    			height: 7,
    			numberOfMines: 8
    		});
    	}

    	get game() {
    		return this.$$.ctx[5];
    	}
    }

    /* src/components/menu.svelte generated by Svelte v3.37.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-st1qmb-style";
    	style.textContent = "#input-fields.svelte-st1qmb{align-items:center;justify-content:center;display:flex;flex-direction:column}#menu.svelte-st1qmb{display:flex;align-items:center;justify-content:center;flex-direction:column}button.svelte-st1qmb{font-size:1rem;padding:1rem;width:20rem}";
    	append(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let button;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let input1;
    	let t6;
    	let label2;
    	let input2;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Start";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Width:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Height: ";
    			input1 = element("input");
    			t6 = space();
    			label2 = element("label");
    			label2.textContent = "Number of Mines: ";
    			input2 = element("input");
    			attr(button, "id", "start");
    			attr(button, "class", "svelte-st1qmb");
    			attr(label0, "for", "width");
    			attr(input0, "id", "width");
    			attr(input0, "type", "number");
    			attr(label1, "for", "height");
    			attr(input1, "id", "height");
    			attr(input1, "type", "number");
    			attr(label2, "for", "number-of-mines");
    			attr(input2, "id", "number-of-mines");
    			attr(input2, "type", "number");
    			attr(div0, "id", "input-fields");
    			attr(div0, "class", "svelte-st1qmb");
    			attr(div1, "id", "menu");
    			attr(div1, "class", "svelte-st1qmb");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button);
    			append(div1, t1);
    			append(div1, div0);
    			append(div0, label0);
    			append(div0, t3);
    			append(div0, input0);
    			set_input_value(input0, /*width*/ ctx[0]);
    			append(div0, t4);
    			append(div0, label1);
    			append(div0, input1);
    			set_input_value(input1, /*height*/ ctx[1]);
    			append(div0, t6);
    			append(div0, label2);
    			append(div0, input2);
    			set_input_value(input2, /*numberOfMines*/ ctx[2]);

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", /*onStart*/ ctx[3]),
    					listen(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen(input2, "input", /*input2_input_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*width*/ 1 && to_number(input0.value) !== /*width*/ ctx[0]) {
    				set_input_value(input0, /*width*/ ctx[0]);
    			}

    			if (dirty & /*height*/ 2 && to_number(input1.value) !== /*height*/ ctx[1]) {
    				set_input_value(input1, /*height*/ ctx[1]);
    			}

    			if (dirty & /*numberOfMines*/ 4 && to_number(input2.value) !== /*numberOfMines*/ ctx[2]) {
    				set_input_value(input2, /*numberOfMines*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatcher = createEventDispatcher();
    	let width = 10;
    	let height = 10;
    	let numberOfMines = 10;

    	function onStart() {
    		dispatcher("start", { width, height, numberOfMines });
    	}

    	function input0_input_handler() {
    		width = to_number(this.value);
    		$$invalidate(0, width);
    	}

    	function input1_input_handler() {
    		height = to_number(this.value);
    		$$invalidate(1, height);
    	}

    	function input2_input_handler() {
    		numberOfMines = to_number(this.value);
    		$$invalidate(2, numberOfMines);
    	}

    	return [
    		width,
    		height,
    		numberOfMines,
    		onStart,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-st1qmb-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/components/timer.svelte generated by Svelte v3.37.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1g1xmd9-style";
    	style.textContent = "span.svelte-1g1xmd9{font-family:'Roboto Mono', monospace}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let span;
    	let t_value = formatTime(/*startTime*/ ctx[0], /*currentTime*/ ctx[1]) + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    			attr(span, "class", "svelte-1g1xmd9");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*startTime, currentTime*/ 3 && t_value !== (t_value = formatTime(/*startTime*/ ctx[0], /*currentTime*/ ctx[1]) + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function formatTime(start, current) {
    	if (!start && !current) return;
    	const diffInSeconds = (current - start) / 1000;
    	var seconds = Math.floor(diffInSeconds % 60);
    	var ms = Math.floor((diffInSeconds - Math.floor(diffInSeconds)) * 1000);
    	var minutes = Math.floor(diffInSeconds / 60 % 60);
    	var hours = Math.floor(diffInSeconds / 60 / 60);
    	const hoursString = hours.toString().padStart(2, "0");
    	const minutesString = minutes.toString().padStart(2, "0");
    	const secondsString = seconds.toString().padStart(2, "0");
    	const msString = ms.toString().padStart(3, "0");
    	return `${hoursString}:${minutesString}:${secondsString}.${msString}`;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { active = true } = $$props;
    	let intervalInstance = undefined;
    	let startTime;
    	let currentTime;

    	beforeUpdate(() => {
    		if (active) {
    			start();
    		} else {
    			stop();
    		}
    	});

    	function start() {
    		if (intervalInstance !== undefined) return;
    		$$invalidate(0, startTime = Date.now());

    		intervalInstance = setInterval(
    			() => {
    				$$invalidate(1, currentTime = Date.now());
    			},
    			10
    		);
    	}

    	function stop() {
    		if (intervalInstance === undefined) return;
    		clearInterval(intervalInstance);
    		intervalInstance = undefined;
    	}

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(2, active = $$props.active);
    	};

    	return [startTime, currentTime, active];
    }

    class Timer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1g1xmd9-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { active: 2 });
    	}
    }

    /* src/components/app.svelte generated by Svelte v3.37.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-xwach9-style";
    	style.textContent = "div.svelte-xwach9{display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:'Varela Round', sans-serif;font-size:2rem}";
    	append(document.head, style);
    }

    // (49:38) 
    function create_if_block_1(ctx) {
    	let menu;
    	let current;
    	menu = new Menu({});
    	menu.$on("start", /*onStart*/ ctx[6]);

    	return {
    		c() {
    			create_component(menu.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};
    }

    // (46:2) {#if shouldShowGame(gameState)}
    function create_if_block(ctx) {
    	let timer;
    	let t;
    	let game;
    	let current;

    	timer = new Timer({
    			props: {
    				active: /*gameState*/ ctx[1] === /*GameState*/ ctx[0].Game
    			}
    		});

    	game = new Game({
    			props: {
    				width: /*width*/ ctx[3],
    				height: /*height*/ ctx[4],
    				numberOfMines: /*numberOfMines*/ ctx[2]
    			}
    		});

    	game.$on("end", /*onGameEnd*/ ctx[5]);

    	return {
    		c() {
    			create_component(timer.$$.fragment);
    			t = space();
    			create_component(game.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(timer, target, anchor);
    			insert(target, t, anchor);
    			mount_component(game, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const timer_changes = {};
    			if (dirty & /*gameState, GameState*/ 3) timer_changes.active = /*gameState*/ ctx[1] === /*GameState*/ ctx[0].Game;
    			timer.$set(timer_changes);
    			const game_changes = {};
    			if (dirty & /*width*/ 8) game_changes.width = /*width*/ ctx[3];
    			if (dirty & /*height*/ 16) game_changes.height = /*height*/ ctx[4];
    			if (dirty & /*numberOfMines*/ 4) game_changes.numberOfMines = /*numberOfMines*/ ctx[2];
    			game.$set(game_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(timer.$$.fragment, local);
    			transition_in(game.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(timer.$$.fragment, local);
    			transition_out(game.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(timer, detaching);
    			if (detaching) detach(t);
    			destroy_component(game, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let show_if;
    	let show_if_1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*gameState*/ 2) show_if = !!/*shouldShowGame*/ ctx[7](/*gameState*/ ctx[1]);
    		if (show_if) return 0;
    		if (dirty & /*gameState*/ 2) show_if_1 = !!/*shouldShowMenu*/ ctx[8](/*gameState*/ ctx[1]);
    		if (show_if_1) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx, -1))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Minesweeper";
    			t1 = space();
    			if (if_block) if_block.c();
    			attr(div, "class", "svelte-xwach9");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(div, t1);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	var GameState;

    	(function (GameState) {
    		GameState[GameState["Menu"] = 0] = "Menu";
    		GameState[GameState["Game"] = 1] = "Game";
    		GameState[GameState["PostGame"] = 2] = "PostGame";
    	})(GameState || (GameState = {}));

    	
    	let gameState = GameState.Menu;
    	let numberOfMines = 10;
    	let width = 10;
    	let height = 10;

    	function onGameEnd(e) {
    		console.log(e);
    		$$invalidate(1, gameState = GameState.PostGame);

    		setTimeout(
    			() => {
    				$$invalidate(1, gameState = GameState.Menu);
    			},
    			5000
    		);
    	}

    	function onStart(e) {
    		$$invalidate(3, { width, height, numberOfMines } = e.detail, width, $$invalidate(4, height), $$invalidate(2, numberOfMines));
    		$$invalidate(1, gameState = GameState.Game);
    	}

    	function shouldShowGame(state) {
    		return state === GameState.Game || state === GameState.PostGame;
    	}

    	function shouldShowMenu(state) {
    		return state === GameState.Menu;
    	}

    	return [
    		GameState,
    		gameState,
    		numberOfMines,
    		width,
    		height,
    		onGameEnd,
    		onStart,
    		shouldShowGame,
    		shouldShowMenu
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-xwach9-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    new App({
        target: document.getElementById('target'),
        props: {
            answer: 42
        }
    });

}());
