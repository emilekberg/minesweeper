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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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

    const northWest = { x: -1, y: -1 };
    const north = { x: 0, y: -1 };
    const northEast = { x: 1, y: -1 };
    const west = { x: -1, y: 0 };
    const east = { x: 1, y: 0 };
    const southWest = { x: -1, y: 1 };
    const south = { x: 0, y: 1 };
    const southEast = { x: 1, y: 1 };
    /**
     *
     */
    const neighbourPositions = [
        northWest, north, northEast,
        west, east,
        southWest, south, southEast
    ];

    /**
     * Minesweeper game.
     */
    class MineSweeper {
        constructor() {
            this._isGameOver = false;
        }
        /**
         * Initializes a new game.
         * @param width
         * @param height
         * @param numMines
         */
        init(width, height, numMines) {
            this._isGameOver = false;
            this.width = width;
            this.height = height;
            this.data = [];
            for (let i = 0; i < width * height; i++) {
                const x = i % width;
                const y = Math.floor(i / width);
                this.data.push({
                    x,
                    y,
                    isMine: false,
                    hasFlag: false,
                    numNeighborMines: 0,
                    isRevealed: false
                });
            }
            for (let i = 0; i < numMines; i++) {
                const index = Math.floor(Math.random() * this.data.length);
                this.data[index].isMine = true;
            }
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i].isMine)
                    continue;
                let numNeighbours = 0;
                const position = this.data[i];
                for (const neighbour of neighbourPositions) {
                    const x = position.x + neighbour.x;
                    const y = position.y + neighbour.y;
                    if (!this.isPointWithinBoundries(x, y))
                        continue;
                    const neighbourId = y * width + x;
                    if (this.data[neighbourId].isMine) {
                        numNeighbours++;
                    }
                }
                position.numNeighborMines = numNeighbours;
            }
        }
        toggleFlag(x, y) {
            if (!this.isPointWithinBoundries(x, y)) {
                return;
            }
            const index = y * this.width + x;
            this.data[index].hasFlag = !this.data[index].hasFlag;
        }
        /**
         * Reveals the position.
         * If it's blank, reveal the entire shape.
         * @param x
         * @param y
         * @returns
         */
        reveal(x, y) {
            const index = y * this.width + x;
            if (this.data[index].isRevealed) {
                return;
            }
            if (this.data[index].isMine) {
                this.revealList(this.data);
                this._isGameOver = true;
                return;
            }
            this.data[index].isRevealed = true;
            if (this.data[index].numNeighborMines > 0) {
                // return since we should only reveal single digit here.
                return;
            }
            // if the clicked square is blank, traverse neighbour cells
            // and reveal them.
            const result = [];
            this.getNeighboursWithoutMine(x, y, result);
            this.revealList(result);
        }
        /**
         * Mark all cells in the list as revealed.
         * This means they will be rendered.
         * @param toReveal
         */
        revealList(toReveal) {
            toReveal.forEach(x => x.isRevealed = true);
        }
        /**
         * Traverses neighbouring nodes of the specified position.
         * Adds them to the out array if they're not present already
         * and recursivly traverse the array with nodes left.
         * @param x
         * @param y
         * @param out
         */
        getNeighboursWithoutMine(x, y, out) {
            for (const pos of neighbourPositions) {
                const checkX = pos.x + x;
                const checkY = pos.y + y;
                if (!this.isPointWithinBoundries(checkX, checkY))
                    continue;
                const index = checkY * this.width + checkX;
                const cell = this.data[index];
                if (cell.isMine) {
                    continue;
                }
                if (out.find(x => x.x === checkX && x.y === checkY)) {
                    continue;
                }
                out.push(cell);
                if (cell.numNeighborMines > 0) {
                    continue;
                }
                this.getNeighboursWithoutMine(checkX, checkY, out);
            }
        }
        /**
         * Returns a soft-readonly copy of the cell data.
         * @returns
         */
        getData() {
            return this.data;
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
        isGameOver() {
            return this._isGameOver;
        }
    }

    /* src/components/faces/mine.svelte generated by Svelte v3.37.0 */

    function add_css$5() {
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
    		if (!document.getElementById("svelte-1fo983k-style")) add_css$5();
    		init(this, options, null, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/components/faces/number.svelte generated by Svelte v3.37.0 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-jqtz8e-style";
    	style.textContent = "span.svelte-jqtz8e{font-family:'Varela Round', sans-serif;font-size:2rem}.count-1.svelte-jqtz8e{color:yellow}.count-2.svelte-jqtz8e{color:orange}.count-3.svelte-jqtz8e{color:orangered}.count-4.svelte-jqtz8e{color:red}";
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
    			attr(span, "class", span_class_value = "neighbour-count count-" + /*value*/ ctx[0] + " svelte-jqtz8e");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1) set_data(t, /*value*/ ctx[0]);

    			if (dirty & /*value*/ 1 && span_class_value !== (span_class_value = "neighbour-count count-" + /*value*/ ctx[0] + " svelte-jqtz8e")) {
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { value = 0 } = $$props;

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value];
    }

    class Number extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-jqtz8e-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, { value: 0 });
    	}
    }

    /* src/components/faces/flag.svelte generated by Svelte v3.37.0 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-10fxtf1-style";
    	style.textContent = "span.svelte-10fxtf1{font-size:2rem}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
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
    		if (!document.getElementById("svelte-10fxtf1-style")) add_css$3();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/components/card.svelte generated by Svelte v3.37.0 */

    function add_css$2() {
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

    function instance$3($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-13qzd5e-style")) add_css$2();
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { isFlipped: 0, animationDelay: 1 });
    	}
    }

    /* src/components/grid.svelte generated by Svelte v3.37.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-11jn1ry-style";
    	style.textContent = ".row.svelte-11jn1ry{display:flex}.scene.svelte-11jn1ry{perspective:600px}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (62:12) {#if cellData.hasFlag}
    function create_if_block_2(ctx) {
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

    // (61:10) 
    function create_front_slot(ctx) {
    	let div;
    	let current;
    	let if_block = /*cellData*/ ctx[12].hasFlag && create_if_block_2();

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr(div, "slot", "front");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*cellData*/ ctx[12].hasFlag) {
    				if (if_block) {
    					if (dirty & /*grid*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
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
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (65:12) {#if cellData.isMine}
    function create_if_block_1(ctx) {
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

    // (66:12) {#if cellData.numNeighborMines > 0}
    function create_if_block(ctx) {
    	let number;
    	let current;

    	number = new Number({
    			props: {
    				value: /*cellData*/ ctx[12].numNeighborMines
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
    			if (dirty & /*grid*/ 1) number_changes.value = /*cellData*/ ctx[12].numNeighborMines;
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

    // (64:10) 
    function create_back_slot(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block0 = /*cellData*/ ctx[12].isMine && create_if_block_1();
    	let if_block1 = /*cellData*/ ctx[12].numNeighborMines > 0 && create_if_block(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr(div, "slot", "back");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*cellData*/ ctx[12].isMine) {
    				if (if_block0) {
    					if (dirty & /*grid*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1();
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

    			if (/*cellData*/ ctx[12].numNeighborMines > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*grid*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
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

    // (51:6) {#each cells as cellData}
    function create_each_block_1(ctx) {
    	let card;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[5](/*cellData*/ ctx[12]);
    	}

    	function contextmenu_handler(...args) {
    		return /*contextmenu_handler*/ ctx[6](/*cellData*/ ctx[12], ...args);
    	}

    	card = new Card({
    			props: {
    				isFlipped: /*cellData*/ ctx[12].isRevealed,
    				animationDelay: /*getAnimationDelay*/ ctx[3](/*cellData*/ ctx[12].x, /*cellData*/ ctx[12].y),
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
    			if (dirty & /*grid*/ 1) card_changes.isFlipped = /*cellData*/ ctx[12].isRevealed;
    			if (dirty & /*grid*/ 1) card_changes.animationDelay = /*getAnimationDelay*/ ctx[3](/*cellData*/ ctx[12].x, /*cellData*/ ctx[12].y);

    			if (dirty & /*$$scope, grid*/ 32769) {
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

    // (49:2) {#each grid as cells, row}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value_1 = /*cells*/ ctx[9];
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
    			attr(div, "class", "row svelte-11jn1ry");
    			attr(div, "id", "row-" + /*row*/ ctx[11]);
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
    			if (dirty & /*grid, getAnimationDelay, onClick, onRightClick*/ 15) {
    				each_value_1 = /*cells*/ ctx[9];
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
    			attr(div, "class", "scene svelte-11jn1ry");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*grid, getAnimationDelay, onClick, onRightClick*/ 15) {
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

    function instance$2($$self, $$props, $$invalidate) {
    	
    	
    	let { game } = $$props;
    	game.init(10, 10, 10);
    	let lastClick = { x: 0, y: 0 };
    	let grid = getGrid(game.getData());

    	function onClick(x, y) {
    		lastClick = { x, y };
    		game.reveal(x, y);
    		$$invalidate(0, grid = getGrid(game.getData()));
    	}

    	function onRightClick(x, y) {
    		game.toggleFlag(x, y);
    		$$invalidate(0, grid = getGrid(game.getData()));
    	}

    	function distanceToLastClick(x, y) {
    		const dX = lastClick.x - x;
    		const dY = lastClick.y - y;
    		const len = Math.sqrt(dX * dX + dY * dY);
    		return len;
    	}

    	function getAnimationDelay(x, y) {
    		if (game.isGameOver()) {
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
    		if ("game" in $$props) $$invalidate(4, game = $$props.game);
    	};

    	return [
    		grid,
    		onClick,
    		onRightClick,
    		getAnimationDelay,
    		game,
    		click_handler,
    		contextmenu_handler
    	];
    }

    class Grid extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-11jn1ry-style")) add_css$1();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { game: 4 });
    	}
    }

    /* src/components/timer.svelte generated by Svelte v3.37.0 */

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1_value = formatTime(/*hours*/ ctx[0], /*minutes*/ ctx[1], /*seconds*/ ctx[2]) + "";
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Time: ");
    			span = element("span");
    			t1 = text(t1_value);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, span);
    			append(span, t1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*hours, minutes, seconds*/ 7 && t1_value !== (t1_value = formatTime(/*hours*/ ctx[0], /*minutes*/ ctx[1], /*seconds*/ ctx[2]) + "")) set_data(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function formatTime(hours, minutes, seconds) {
    	const hoursString = leftPad(hours, 2, 0);
    	const minutesString = leftPad(minutes, 2, 0);
    	const secondsString = leftPad(seconds, 2, 0);
    	return `${hoursString}:${minutesString}:${secondsString}`;
    }

    function leftPad(value, numberOfLetters, letter) {
    	let valueString = value.toString();

    	if (valueString.length >= numberOfLetters) {
    		return valueString;
    	}

    	let prefix = "";

    	for (let i = valueString.length; i < numberOfLetters; i++) {
    		prefix += letter;
    	}

    	valueString = prefix + valueString;
    	return valueString;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let hours = 0;
    	let minutes = 0;
    	let seconds = 0;
    	let { active = true } = $$props;

    	let intervalInstance = setInterval(
    		() => {
    			if (!active) {
    				return;
    			}

    			$$invalidate(2, seconds++, seconds);

    			if (seconds >= 60) {
    				$$invalidate(2, seconds = 0);
    				$$invalidate(1, minutes++, minutes);
    			}

    			if (minutes >= 60) {
    				$$invalidate(1, minutes = 0);
    				$$invalidate(0, hours++, hours);
    			}
    		},
    		1000
    	);

    	if (!active) {
    		clearInterval(intervalInstance);
    	}

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    	};

    	return [hours, minutes, seconds, active];
    }

    class Timer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { active: 3 });
    	}
    }

    /* src/components/game.svelte generated by Svelte v3.37.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-110t12k-style";
    	style.textContent = "div.svelte-110t12k{display:flex;flex-direction:column;justify-content:center;align-items:center}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let timer;
    	let t2;
    	let grid;
    	let current;

    	timer = new Timer({
    			props: { active: !/*game*/ ctx[0].isGameOver() }
    		});

    	grid = new Grid({
    			props: {
    				game: /*game*/ ctx[0],
    				width: "10",
    				height: "10",
    				numMines: "10"
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Mine sweeper";
    			t1 = space();
    			create_component(timer.$$.fragment);
    			t2 = space();
    			create_component(grid.$$.fragment);
    			attr(div, "class", "svelte-110t12k");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(div, t1);
    			mount_component(timer, div, null);
    			append(div, t2);
    			mount_component(grid, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(timer.$$.fragment, local);
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(timer.$$.fragment, local);
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(timer);
    			destroy_component(grid);
    		}
    	};
    }

    function instance($$self) {
    	var game = new MineSweeper();
    	return [game];
    }

    class Game extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-110t12k-style")) add_css();
    		init(this, options, instance, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/components/app.svelte generated by Svelte v3.37.0 */

    function create_fragment(ctx) {
    	let game;
    	let current;
    	game = new Game({});

    	return {
    		c() {
    			create_component(game.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(game, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(game.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(game.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(game, detaching);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    new App({
        target: document.getElementById('target'),
        props: {
            answer: 42
        }
    });

}());
