
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function empty() {
        return text('');
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
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\App.svelte generated by Svelte v3.16.7 */

    const { window: window_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[67] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[71] = list[i];
    	child_ctx[72] = list;
    	child_ctx[73] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[74] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[77] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[79] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    // (985:1) {#if gui.deviceSelectOpen}
    function create_if_block_14(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let div3_transition;
    	let current;
    	let dispose;
    	let each_value_7 = /*config*/ ctx[6].device;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите устройство";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-18zr5gz");
    			add_location(p, file, 987, 4, 21922);
    			attr_dev(ul, "class", "ul svelte-18zr5gz");
    			attr_dev(ul, "id", "deviceSelectList");
    			add_location(ul, file, 989, 5, 22044);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-18zr5gz");
    			add_location(div0, file, 988, 4, 21967);
    			attr_dev(button, "id", "deviceSelectCloseButton");
    			attr_dev(button, "class", "button svelte-18zr5gz");
    			add_location(button, file, 999, 5, 22480);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-18zr5gz");
    			add_location(div1, file, 998, 4, 22436);
    			attr_dev(div2, "class", "mutlist svelte-18zr5gz");
    			add_location(div2, file, 986, 3, 21895);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-18zr5gz");
    			add_location(div3, file, 985, 2, 21852);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[28], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				each_value_7 = /*config*/ ctx[6].device;
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_7(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_7.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div3_transition) div3_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(985:1) {#if gui.deviceSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (991:6) {#each config.device as device,id}
    function create_each_block_7(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*device*/ ctx[79] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[66];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioDevice" + /*id*/ ctx[66]);
    			attr_dev(input, "name", "radioDevice");
    			attr_dev(input, "class", "inputDevice svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][3].push(input);
    			add_location(input, file, 992, 8, 22157);
    			attr_dev(div, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div, file, 993, 37, 22320);
    			attr_dev(label, "for", label_for_value = "radioDevice" + /*id*/ ctx[66]);
    			attr_dev(label, "class", "svelte-18zr5gz");
    			add_location(label, file, 993, 8, 22291);
    			attr_dev(li, "class", "li svelte-18zr5gz");
    			add_location(li, file, 991, 7, 22132);
    			dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[26]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[6].selectDevice;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				input.checked = input.__value === /*config*/ ctx[6].selectDevice;
    			}

    			if (dirty[0] & /*config*/ 64 && t1_value !== (t1_value = /*device*/ ctx[79] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[27][3].splice(/*$$binding_groups*/ ctx[27][3].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(991:6) {#each config.device as device,id}",
    		ctx
    	});

    	return block;
    }

    // (1005:1) {#if gui.mutList}
    function create_if_block_13(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let div0;
    	let t3;
    	let div1;
    	let button;
    	let div3_transition;
    	let current;
    	let dispose;
    	let each_value_6 = /*mutList*/ ctx[11];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Мут лист игроков:";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-18zr5gz");
    			add_location(p, file, 1007, 4, 22729);
    			attr_dev(input, "class", "input-text leaf mut-leaf svelte-18zr5gz");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Введите никнейм");
    			add_location(input, file, 1008, 4, 22772);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "mutListPlayers svelte-18zr5gz");
    			add_location(div0, file, 1009, 4, 22860);
    			attr_dev(button, "id", "mutListCloseButton");
    			attr_dev(button, "class", "button svelte-18zr5gz");
    			add_location(button, file, 1015, 5, 23091);
    			set_style(div1, "text-align", "center");
    			attr_dev(div1, "class", "svelte-18zr5gz");
    			add_location(div1, file, 1014, 4, 23051);
    			attr_dev(div2, "class", "mutlist svelte-18zr5gz");
    			add_location(div2, file, 1006, 3, 22702);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-18zr5gz");
    			add_location(div3, file, 1005, 2, 22659);
    			dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[29], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, input);
    			append_dev(div2, t2);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mutList*/ 2048) {
    				each_value_6 = /*mutList*/ ctx[11];
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_6.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div3_transition) div3_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(1005:1) {#if gui.mutList}",
    		ctx
    	});

    	return block;
    }

    // (1011:5) {#each mutList as name,id}
    function create_each_block_6(ctx) {
    	let button;
    	let t_value = /*name*/ ctx[77] + "";
    	let t;
    	let button_id_value;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "id", button_id_value = "1" + /*id*/ ctx[66] + "Vf");
    			attr_dev(button, "class", "button selector mut-leaf svelte-18zr5gz");
    			add_location(button, file, 1011, 7, 22950);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(1011:5) {#each mutList as name,id}",
    		ctx
    	});

    	return block;
    }

    // (1021:1) {#if gui.roomSelectOpen}
    function create_if_block_12(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let div4_transition;
    	let current;
    	let dispose;
    	let each_value_5 = /*config*/ ctx[6].room;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите комнату";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-18zr5gz");
    			add_location(p, file, 1024, 24, 23392);
    			attr_dev(ul, "class", "ul svelte-18zr5gz");
    			attr_dev(ul, "id", "roomSelectList");
    			add_location(ul, file, 1026, 28, 23554);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-18zr5gz");
    			add_location(div0, file, 1025, 24, 23454);
    			attr_dev(button, "id", "roomSelectCloseButton");
    			attr_dev(button, "class", "button svelte-18zr5gz");
    			add_location(button, file, 1036, 28, 24072);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-18zr5gz");
    			add_location(div1, file, 1035, 24, 24005);
    			attr_dev(div2, "class", "mutlist svelte-18zr5gz");
    			add_location(div2, file, 1023, 16, 23345);
    			attr_dev(div3, "id", "roomSelect");
    			attr_dev(div3, "class", "svelte-18zr5gz");
    			add_location(div3, file, 1022, 3, 23306);
    			attr_dev(div4, "id", "floatwindow");
    			attr_dev(div4, "class", "svelte-18zr5gz");
    			add_location(div4, file, 1021, 2, 23263);
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[31], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				each_value_5 = /*config*/ ctx[6].room;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div4_transition) div4_transition = create_bidirectional_transition(div4, fade, {}, true);
    				div4_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div4_transition) div4_transition = create_bidirectional_transition(div4, fade, {}, false);
    			div4_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div4_transition) div4_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(1021:1) {#if gui.roomSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (1028:8) {#each config.room as room,id}
    function create_each_block_5(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*room*/ ctx[64] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[66];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioRoom" + /*id*/ ctx[66]);
    			attr_dev(input, "name", "radioRoom");
    			attr_dev(input, "class", "inputDevice svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][2].push(input);
    			add_location(input, file, 1029, 10, 23667);
    			attr_dev(div, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div, file, 1030, 37, 23824);
    			attr_dev(label, "for", label_for_value = "radioRoom" + /*id*/ ctx[66]);
    			attr_dev(label, "class", "svelte-18zr5gz");
    			add_location(label, file, 1030, 10, 23797);
    			attr_dev(li, "class", "li svelte-18zr5gz");
    			add_location(li, file, 1028, 9, 23640);
    			dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[30]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[6].selectRoom;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				input.checked = input.__value === /*config*/ ctx[6].selectRoom;
    			}

    			if (dirty[0] & /*config*/ 64 && t1_value !== (t1_value = /*room*/ ctx[64] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[27][2].splice(/*$$binding_groups*/ ctx[27][2].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(1028:8) {#each config.room as room,id}",
    		ctx
    	});

    	return block;
    }

    // (1043:1) {#if gui.channelSelectOpen}
    function create_if_block_11(ctx) {
    	let div8;
    	let div7;
    	let div6;
    	let p;
    	let t1;
    	let div4;
    	let ul;
    	let t2;
    	let li0;
    	let input0;
    	let t3;
    	let label0;
    	let div0;
    	let t5;
    	let li1;
    	let input1;
    	let label1;
    	let div1;
    	let li2;
    	let input2;
    	let label2;
    	let div2;
    	let li3;
    	let input3;
    	let label3;
    	let div3;
    	let t9;
    	let div5;
    	let button;
    	let div8_transition;
    	let current;
    	let dispose;
    	let each_value_4 = /*config*/ ctx[6].channel;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			p = element("p");
    			p.textContent = "Выберите канал";
    			t1 = space();
    			div4 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			li0 = element("li");
    			input0 = element("input");
    			t3 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "Channel1";
    			t5 = space();
    			li1 = element("li");
    			input1 = element("input");
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "Channel2";
    			li2 = element("li");
    			input2 = element("input");
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Channel3";
    			li3 = element("li");
    			input3 = element("input");
    			label3 = element("label");
    			div3 = element("div");
    			div3.textContent = "Channel4";
    			t9 = space();
    			div5 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-18zr5gz");
    			add_location(p, file, 1046, 24, 24442);
    			attr_dev(input0, "type", "radio");
    			input0.value = "0";
    			attr_dev(input0, "id", "radioChannel0");
    			attr_dev(input0, "name", "radioChannel");
    			attr_dev(input0, "class", "inputDevice svelte-18zr5gz");
    			add_location(input0, file, 1056, 8, 25031);
    			attr_dev(div0, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div0, file, 1057, 35, 25157);
    			attr_dev(label0, "for", "radioChannel0");
    			attr_dev(label0, "class", "svelte-18zr5gz");
    			add_location(label0, file, 1057, 8, 25130);
    			attr_dev(li0, "class", "li svelte-18zr5gz");
    			add_location(li0, file, 1055, 28, 25006);
    			attr_dev(input1, "type", "radio");
    			input1.value = "1";
    			attr_dev(input1, "id", "radioChannel1");
    			attr_dev(input1, "name", "radioChannel");
    			attr_dev(input1, "class", "inputDevice svelte-18zr5gz");
    			add_location(input1, file, 1059, 22, 25252);
    			attr_dev(div1, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div1, file, 1059, 138, 25368);
    			attr_dev(label1, "for", "radioChannel1");
    			attr_dev(label1, "class", "svelte-18zr5gz");
    			add_location(label1, file, 1059, 111, 25341);
    			attr_dev(li1, "class", "li svelte-18zr5gz");
    			add_location(li1, file, 1059, 7, 25237);
    			attr_dev(input2, "type", "radio");
    			input2.value = "2";
    			attr_dev(input2, "id", "radioChannel2");
    			attr_dev(input2, "name", "radioChannel");
    			attr_dev(input2, "class", "inputDevice svelte-18zr5gz");
    			add_location(input2, file, 1059, 215, 25445);
    			attr_dev(div2, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div2, file, 1059, 331, 25561);
    			attr_dev(label2, "for", "radioChannel2");
    			attr_dev(label2, "class", "svelte-18zr5gz");
    			add_location(label2, file, 1059, 304, 25534);
    			attr_dev(li2, "class", "li svelte-18zr5gz");
    			add_location(li2, file, 1059, 200, 25430);
    			attr_dev(input3, "type", "radio");
    			input3.value = "3";
    			attr_dev(input3, "id", "radioChannel3");
    			attr_dev(input3, "name", "radioChannel");
    			attr_dev(input3, "class", "inputDevice svelte-18zr5gz");
    			add_location(input3, file, 1059, 408, 25638);
    			attr_dev(div3, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div3, file, 1059, 524, 25754);
    			attr_dev(label3, "for", "radioChannel3");
    			attr_dev(label3, "class", "svelte-18zr5gz");
    			add_location(label3, file, 1059, 497, 25727);
    			attr_dev(li3, "class", "li svelte-18zr5gz");
    			add_location(li3, file, 1059, 393, 25623);
    			attr_dev(ul, "class", "ul svelte-18zr5gz");
    			attr_dev(ul, "id", "channelSelectList");
    			add_location(ul, file, 1048, 28, 24602);
    			attr_dev(div4, "id", "mutListPlayers");
    			attr_dev(div4, "class", "deviceListPlayers deviceSelectButton svelte-18zr5gz");
    			add_location(div4, file, 1047, 24, 24502);
    			attr_dev(button, "id", "channelSelectCloseButton");
    			attr_dev(button, "class", "button svelte-18zr5gz");
    			add_location(button, file, 1063, 28, 25955);
    			attr_dev(div5, "class", "deviceSelectCloseButton svelte-18zr5gz");
    			add_location(div5, file, 1062, 24, 25888);
    			attr_dev(div6, "class", "mutlist svelte-18zr5gz");
    			add_location(div6, file, 1045, 16, 24395);
    			attr_dev(div7, "id", "channelSelect");
    			attr_dev(div7, "class", "svelte-18zr5gz");
    			add_location(div7, file, 1044, 3, 24353);
    			attr_dev(div8, "id", "floatwindow");
    			attr_dev(div8, "class", "svelte-18zr5gz");
    			add_location(div8, file, 1043, 2, 24310);
    			dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[33], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p);
    			append_dev(div6, t1);
    			append_dev(div6, div4);
    			append_dev(div4, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			append_dev(li0, t3);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    			append_dev(ul, li3);
    			append_dev(li3, input3);
    			append_dev(li3, label3);
    			append_dev(label3, div3);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, button);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				each_value_4 = /*config*/ ctx[6].channel;
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div8_transition) div8_transition = create_bidirectional_transition(div8, fade, {}, true);
    				div8_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div8_transition) div8_transition = create_bidirectional_transition(div8, fade, {}, false);
    			div8_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div8_transition) div8_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(1043:1) {#if gui.channelSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (1050:7) {#each config.channel as channel,id}
    function create_each_block_4(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*channel*/ ctx[74] + "";
    	let t1;
    	let label_for_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[66];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioChanne" + /*id*/ ctx[66]);
    			attr_dev(input, "name", "radioChannel");
    			attr_dev(input, "class", "inputDevice svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][1].push(input);
    			add_location(input, file, 1051, 9, 24721);
    			attr_dev(div, "class", "button selectorDevice svelte-18zr5gz");
    			add_location(div, file, 1052, 38, 24887);
    			attr_dev(label, "for", label_for_value = "radioChanne" + /*id*/ ctx[66]);
    			attr_dev(label, "class", "svelte-18zr5gz");
    			add_location(label, file, 1052, 9, 24858);
    			attr_dev(li, "class", "li svelte-18zr5gz");
    			add_location(li, file, 1050, 8, 24695);
    			dispose = listen_dev(input, "change", /*input_change_handler_2*/ ctx[32]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[6].selectchannel;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 64) {
    				input.checked = input.__value === /*config*/ ctx[6].selectchannel;
    			}

    			if (dirty[0] & /*config*/ 64 && t1_value !== (t1_value = /*channel*/ ctx[74] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[27][1].splice(/*$$binding_groups*/ ctx[27][1].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(1050:7) {#each config.channel as channel,id}",
    		ctx
    	});

    	return block;
    }

    // (1070:1) {#if gui.volumeMainWindow}
    function create_if_block_7(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	let each_value_2 = /*volumeWindowRoom*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "volumeMainWindow svelte-18zr5gz");
    			attr_dev(div, "id", "volumeMainWindow");
    			add_location(div, file, 1070, 2, 26198);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowRoom, volumeWindowPlayer*/ 384) {
    				each_value_2 = /*volumeWindowRoom*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(1070:1) {#if gui.volumeMainWindow}",
    		ctx
    	});

    	return block;
    }

    // (1073:4) {#if room != undefined}
    function create_if_block_8(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let p;
    	let t1_value = /*room*/ ctx[64].name + "";
    	let t1;
    	let t2;
    	let input;
    	let input_id_value;
    	let t3;
    	let label;
    	let label_for_value;
    	let label_class_value;
    	let t4;
    	let t5;
    	let div1_id_value;
    	let dispose;

    	function click_handler_4(...args) {
    		return /*click_handler_4*/ ctx[34](/*room*/ ctx[64], ...args);
    	}

    	let if_block = /*room*/ ctx[64].open && create_if_block_9(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			label = element("label");
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			attr_dev(img, "class", "radiomin svelte-18zr5gz");
    			if (img.src !== (img_src_value = "img/radiomin.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "PicturaCka");
    			add_location(img, file, 1075, 7, 26476);
    			attr_dev(p, "class", "voiceroomlogotext svelte-18zr5gz");
    			add_location(p, file, 1076, 7, 26547);
    			attr_dev(input, "id", input_id_value = "hiddenSetting" + /*id*/ ctx[66]);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-18zr5gz");
    			add_location(input, file, 1077, 7, 26600);
    			attr_dev(label, "for", label_for_value = "hiddenSetting" + /*id*/ ctx[66]);

    			attr_dev(label, "class", label_class_value = "" + (null_to_empty(/*room*/ ctx[64].open
    			? "hiddenSetting"
    			: "hiddenSettingOff") + " svelte-18zr5gz"));

    			add_location(label, file, 1078, 7, 26695);
    			attr_dev(div0, "class", "voiceroomlogo svelte-18zr5gz");
    			add_location(div0, file, 1074, 6, 26440);
    			attr_dev(div1, "id", div1_id_value = "voiceroom" + /*id*/ ctx[66]);
    			attr_dev(div1, "class", "voiceroom svelte-18zr5gz");
    			set_style(div1, "--heights", /*room*/ ctx[64].open ? "20vh" : "6vh");
    			add_location(div1, file, 1073, 5, 26342);
    			dispose = listen_dev(input, "click", click_handler_4, false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, p);
    			append_dev(p, t1);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			append_dev(div0, t3);
    			append_dev(div0, label);
    			append_dev(div1, t4);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t5);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*volumeWindowRoom*/ 128 && t1_value !== (t1_value = /*room*/ ctx[64].name + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*volumeWindowRoom*/ 128 && label_class_value !== (label_class_value = "" + (null_to_empty(/*room*/ ctx[64].open
    			? "hiddenSetting"
    			: "hiddenSettingOff") + " svelte-18zr5gz"))) {
    				attr_dev(label, "class", label_class_value);
    			}

    			if (/*room*/ ctx[64].open) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_9(ctx);
    					if_block.c();
    					if_block.m(div1, t5);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*volumeWindowRoom*/ 128) {
    				set_style(div1, "--heights", /*room*/ ctx[64].open ? "20vh" : "6vh");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(1073:4) {#if room != undefined}",
    		ctx
    	});

    	return block;
    }

    // (1081:6) {#if room.open}
    function create_if_block_9(ctx) {
    	let div;
    	let table;
    	let tbody;
    	let each_value_3 = /*volumeWindowPlayer*/ ctx[8];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(tbody, "class", "svelte-18zr5gz");
    			add_location(tbody, file, 1083, 9, 26956);
    			attr_dev(table, "id", "voiceRoomPlayerSettings1");
    			attr_dev(table, "class", "svelte-18zr5gz");
    			add_location(table, file, 1082, 8, 26908);
    			attr_dev(div, "id", "voiceRoom1PlayerList");
    			attr_dev(div, "class", "voiceRoomPlayerList svelte-18zr5gz");
    			add_location(div, file, 1081, 7, 26839);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 256) {
    				each_value_3 = /*volumeWindowPlayer*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(1081:6) {#if room.open}",
    		ctx
    	});

    	return block;
    }

    // (1086:10) {#if Player.room == id}
    function create_if_block_10(ctx) {
    	let tr;
    	let th0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t1_value = /*Player*/ ctx[71].name + "";
    	let t1;
    	let t2;
    	let th1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let t4_value = /*Player*/ ctx[71].distance + " m." + "";
    	let t4;
    	let p1_id_value;
    	let t5;
    	let th2;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let input;
    	let input_id_value;
    	let t7;
    	let p2;
    	let t8_value = /*Player*/ ctx[71].value + "";
    	let t8;
    	let p2_id_value;
    	let t9;
    	let dispose;

    	function input_change_input_handler() {
    		/*input_change_input_handler*/ ctx[35].call(input, /*Player*/ ctx[71]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th0 = element("th");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			th1 = element("th");
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			th2 = element("th");
    			img2 = element("img");
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			p2 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			if (img0.src !== (img0_src_value = "img/userloc.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "userloc svelte-18zr5gz");
    			attr_dev(img0, "alt", "userloc");
    			add_location(img0, file, 1088, 13, 27139);
    			attr_dev(p0, "class", "userName svelte-18zr5gz");
    			add_location(p0, file, 1089, 13, 27211);
    			attr_dev(th0, "class", "th svelte-18zr5gz");
    			add_location(th0, file, 1087, 12, 27109);
    			if (img1.src !== (img1_src_value = "img/distance.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "imgdistance svelte-18zr5gz");
    			attr_dev(img1, "alt", "distance");
    			add_location(img1, file, 1092, 13, 27311);
    			attr_dev(p1, "id", p1_id_value = "userName" + /*id*/ ctx[66] + "Distance");
    			attr_dev(p1, "class", "userName svelte-18zr5gz");
    			add_location(p1, file, 1093, 13, 27389);
    			attr_dev(th1, "class", "th svelte-18zr5gz");
    			add_location(th1, file, 1091, 12, 27281);
    			if (img2.src !== (img2_src_value = "img/micSettings.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "micSettings svelte-18zr5gz");
    			attr_dev(img2, "alt", "micSettings");
    			add_location(img2, file, 1096, 13, 27537);
    			attr_dev(input, "id", input_id_value = "sliderP" + /*id*/ ctx[66]);
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "100");
    			attr_dev(input, "type", "range");
    			attr_dev(input, "class", "sliderP svelte-18zr5gz");
    			set_style(input, "--columnsP", /*Player*/ ctx[71].value + "%");
    			add_location(input, file, 1097, 13, 27621);
    			attr_dev(p2, "id", p2_id_value = "sliderP" + /*id*/ ctx[66] + "volume");
    			attr_dev(p2, "class", "userName svelte-18zr5gz");
    			add_location(p2, file, 1098, 13, 27773);
    			attr_dev(th2, "id", "grid");
    			attr_dev(th2, "class", "th svelte-18zr5gz");
    			add_location(th2, file, 1095, 12, 27497);
    			attr_dev(tr, "class", "voiceRoomPlayerSettings svelte-18zr5gz");
    			add_location(tr, file, 1086, 11, 27059);

    			dispose = [
    				listen_dev(input, "change", input_change_input_handler),
    				listen_dev(input, "input", input_change_input_handler)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th0);
    			append_dev(th0, img0);
    			append_dev(th0, t0);
    			append_dev(th0, p0);
    			append_dev(p0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, th1);
    			append_dev(th1, img1);
    			append_dev(th1, t3);
    			append_dev(th1, p1);
    			append_dev(p1, t4);
    			append_dev(tr, t5);
    			append_dev(tr, th2);
    			append_dev(th2, img2);
    			append_dev(th2, t6);
    			append_dev(th2, input);
    			set_input_value(input, /*Player*/ ctx[71].value);
    			append_dev(th2, t7);
    			append_dev(th2, p2);
    			append_dev(p2, t8);
    			append_dev(tr, t9);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t1_value !== (t1_value = /*Player*/ ctx[71].name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t4_value !== (t4_value = /*Player*/ ctx[71].distance + " m." + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*volumeWindowPlayer*/ 256) {
    				set_style(input, "--columnsP", /*Player*/ ctx[71].value + "%");
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 256) {
    				set_input_value(input, /*Player*/ ctx[71].value);
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t8_value !== (t8_value = /*Player*/ ctx[71].value + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(1086:10) {#if Player.room == id}",
    		ctx
    	});

    	return block;
    }

    // (1085:10) {#each volumeWindowPlayer as Player}
    function create_each_block_3(ctx) {
    	let if_block_anchor;
    	let if_block = /*Player*/ ctx[71].room == /*id*/ ctx[66] && create_if_block_10(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*Player*/ ctx[71].room == /*id*/ ctx[66]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_10(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(1085:10) {#each volumeWindowPlayer as Player}",
    		ctx
    	});

    	return block;
    }

    // (1072:3) {#each volumeWindowRoom as room,id}
    function create_each_block_2(ctx) {
    	let if_block_anchor;
    	let if_block = /*room*/ ctx[64] != undefined && create_if_block_8(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*room*/ ctx[64] != undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(1072:3) {#each volumeWindowRoom as room,id}",
    		ctx
    	});

    	return block;
    }

    // (1113:1) {#if gui.mainWindowOpen}
    function create_if_block_5(ctx) {
    	let div18;
    	let h1;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div6;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div1;
    	let p0;
    	let t3;
    	let div0;
    	let input0;
    	let t4;
    	let p1;
    	let t5_value = /*config*/ ctx[6].main.soundVolume + "";
    	let t5;
    	let t6;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t7;
    	let div4;
    	let p2;
    	let t9;
    	let div3;
    	let input1;
    	let t10;
    	let p3;
    	let t11_value = /*config*/ ctx[6].main.microphoneVolume + "";
    	let t11;
    	let t12;
    	let div8;
    	let p4;
    	let t14;
    	let div7;
    	let button0;
    	let t16;
    	let button1;
    	let t18;
    	let button2;
    	let t20;
    	let div11;
    	let div9;
    	let p5;
    	let t22;
    	let input2;
    	let t23;
    	let label0;
    	let t24;
    	let div10;
    	let p6;
    	let t26;
    	let input3;
    	let t27;
    	let label1;
    	let t28;
    	let div16;
    	let div13;
    	let div12;
    	let p7;
    	let t30;
    	let input4;
    	let t31;
    	let label2;
    	let t32;
    	let t33;
    	let div15;
    	let button3;
    	let t35;
    	let button4;
    	let t37;
    	let div14;
    	let p8;
    	let t39;
    	let table;
    	let tbody;
    	let tr0;
    	let th0;
    	let img3;
    	let img3_src_value;
    	let t40;
    	let th1;
    	let p9;
    	let t42;
    	let th2;
    	let button5;
    	let t43_value = /*config*/ ctx[6].main.ki.global.key + "";
    	let t43;
    	let button5_class_value;
    	let button5_disabled_value;
    	let t44;
    	let tr1;
    	let th3;
    	let img4;
    	let img4_src_value;
    	let t45;
    	let th4;
    	let p10;
    	let t47;
    	let th5;
    	let button6;
    	let t48_value = /*config*/ ctx[6].main.ki.radio.key + "";
    	let t48;
    	let button6_class_value;
    	let button6_disabled_value;
    	let t49;
    	let div17;
    	let button7;
    	let div18_transition;
    	let current;
    	let dispose;
    	let if_block = !/*config*/ ctx[6].main.inputmode && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			div18 = element("div");
    			h1 = element("h1");
    			img0 = element("img");
    			t0 = space();
    			div6 = element("div");
    			div2 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Громкость звука";
    			t3 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t4 = space();
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t7 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Громкость микрофона";
    			t9 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t10 = space();
    			p3 = element("p");
    			t11 = text(t11_value);
    			t12 = space();
    			div8 = element("div");
    			p4 = element("p");
    			p4.textContent = "Устройство ввода:";
    			t14 = space();
    			div7 = element("div");
    			button0 = element("button");
    			button0.textContent = "Микрофон";
    			t16 = space();
    			button1 = element("button");
    			button1.textContent = "Мут лист";
    			t18 = space();
    			button2 = element("button");
    			button2.textContent = "Громкость игроков";
    			t20 = space();
    			div11 = element("div");
    			div9 = element("div");
    			p5 = element("p");
    			p5.textContent = "Включение звука";
    			t22 = space();
    			input2 = element("input");
    			t23 = space();
    			label0 = element("label");
    			t24 = space();
    			div10 = element("div");
    			p6 = element("p");
    			p6.textContent = "3D Звук";
    			t26 = space();
    			input3 = element("input");
    			t27 = space();
    			label1 = element("label");
    			t28 = space();
    			div16 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			p7 = element("p");
    			p7.textContent = "Режим ввода";
    			t30 = space();
    			input4 = element("input");
    			t31 = space();
    			label2 = element("label");
    			t32 = space();
    			if (if_block) if_block.c();
    			t33 = space();
    			div15 = element("div");
    			button3 = element("button");
    			button3.textContent = "Выбор чата";
    			t35 = space();
    			button4 = element("button");
    			button4.textContent = "Выбор канала";
    			t37 = space();
    			div14 = element("div");
    			p8 = element("p");
    			p8.textContent = "Назначение клавиш:";
    			t39 = space();
    			table = element("table");
    			tbody = element("tbody");
    			tr0 = element("tr");
    			th0 = element("th");
    			img3 = element("img");
    			t40 = space();
    			th1 = element("th");
    			p9 = element("p");
    			p9.textContent = "Говорить";
    			t42 = space();
    			th2 = element("th");
    			button5 = element("button");
    			t43 = text(t43_value);
    			t44 = space();
    			tr1 = element("tr");
    			th3 = element("th");
    			img4 = element("img");
    			t45 = space();
    			th4 = element("th");
    			p10 = element("p");
    			p10.textContent = "Говорить в рацию";
    			t47 = space();
    			th5 = element("th");
    			button6 = element("button");
    			t48 = text(t48_value);
    			t49 = space();
    			div17 = element("div");
    			button7 = element("button");
    			button7.textContent = "Закрыть";
    			attr_dev(img0, "class", "mainImg svelte-18zr5gz");
    			if (img0.src !== (img0_src_value = "img/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			add_location(img0, file, 1114, 17, 28112);
    			attr_dev(h1, "id", "logo");
    			attr_dev(h1, "class", "svelte-18zr5gz");
    			add_location(h1, file, 1114, 3, 28098);
    			if (img1.src !== (img1_src_value = "img/headphones.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Headphones");
    			attr_dev(img1, "class", "inline-block headphones shadow svelte-18zr5gz");
    			add_location(img1, file, 1117, 5, 28224);
    			attr_dev(p0, "class", "volume svelte-18zr5gz");
    			add_location(p0, file, 1119, 6, 28363);
    			attr_dev(input0, "id", "range1");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "class", "slider svelte-18zr5gz");
    			set_style(input0, "--columns", /*config*/ ctx[6].main.soundVolume + "%");
    			add_location(input0, file, 1121, 7, 28437);
    			attr_dev(p1, "class", "light inline-block svelte-18zr5gz");
    			add_location(p1, file, 1136, 7, 28892);
    			attr_dev(div0, "class", "volume svelte-18zr5gz");
    			add_location(div0, file, 1120, 6, 28408);
    			attr_dev(div1, "class", "inline-block soundvolume svelte-18zr5gz");
    			add_location(div1, file, 1118, 5, 28317);
    			attr_dev(div2, "class", "sound svelte-18zr5gz");
    			add_location(div2, file, 1116, 4, 28198);
    			if (img2.src !== (img2_src_value = "img/mic.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Mic");
    			attr_dev(img2, "class", "mic inline-block shadow svelte-18zr5gz");
    			add_location(img2, file, 1141, 5, 29022);
    			attr_dev(p2, "class", "volume svelte-18zr5gz");
    			add_location(p2, file, 1143, 5, 29139);
    			attr_dev(input1, "id", "range2");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "class", "slider svelte-18zr5gz");
    			set_style(input1, "--columns", /*config*/ ctx[6].main.microphoneVolume + "%");
    			add_location(input1, file, 1145, 7, 29217);
    			attr_dev(p3, "class", "light inline-block svelte-18zr5gz");
    			add_location(p3, file, 1160, 7, 29695);
    			attr_dev(div3, "class", "volume svelte-18zr5gz");
    			add_location(div3, file, 1144, 6, 29188);
    			attr_dev(div4, "class", "inline-block soundvolume svelte-18zr5gz");
    			add_location(div4, file, 1142, 5, 29094);
    			attr_dev(div5, "class", "sound svelte-18zr5gz");
    			add_location(div5, file, 1140, 4, 28996);
    			attr_dev(div6, "id", "boxvoice");
    			attr_dev(div6, "class", "svelte-18zr5gz");
    			add_location(div6, file, 1115, 3, 28173);
    			attr_dev(p4, "class", "regular svelte-18zr5gz");
    			add_location(p4, file, 1166, 4, 29843);
    			attr_dev(button0, "class", "input-text deviceSelectOpen svelte-18zr5gz");
    			attr_dev(button0, "id", "deviceSelectOpenButton");
    			add_location(button0, file, 1168, 5, 29901);
    			attr_dev(button1, "class", "button mut shadow svelte-18zr5gz");
    			attr_dev(button1, "id", "mutListOpenButton");
    			add_location(button1, file, 1169, 5, 30042);
    			attr_dev(button2, "class", "button mut shadow svelte-18zr5gz");
    			attr_dev(button2, "id", "volumePlayersButton");
    			add_location(button2, file, 1170, 5, 30159);
    			attr_dev(div7, "class", "svelte-18zr5gz");
    			add_location(div7, file, 1167, 4, 29889);
    			attr_dev(div8, "class", "boxdevice svelte-18zr5gz");
    			add_location(div8, file, 1165, 3, 29814);
    			attr_dev(p5, "class", "svelte-18zr5gz");
    			add_location(p5, file, 1175, 5, 30385);
    			attr_dev(input2, "id", "triggerOnOffSound");
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-18zr5gz");
    			add_location(input2, file, 1176, 5, 30414);
    			attr_dev(label0, "for", "triggerOnOffSound");
    			attr_dev(label0, "class", "checker onoff-sound svelte-18zr5gz");
    			add_location(label0, file, 1177, 5, 30579);
    			attr_dev(div9, "class", "alignment svelte-18zr5gz");
    			add_location(div9, file, 1174, 4, 30355);
    			attr_dev(p6, "class", "svelte-18zr5gz");
    			add_location(p6, file, 1180, 5, 30702);
    			attr_dev(input3, "id", "triggerSound3D");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-18zr5gz");
    			add_location(input3, file, 1181, 5, 30723);
    			attr_dev(label1, "for", "triggerSound3D");
    			attr_dev(label1, "class", "checker checker-sound3D svelte-18zr5gz");
    			add_location(label1, file, 1182, 5, 30883);
    			attr_dev(div10, "class", "sound3D alignment svelte-18zr5gz");
    			add_location(div10, file, 1179, 4, 30664);
    			attr_dev(div11, "class", "boxmodes alignment svelte-18zr5gz");
    			add_location(div11, file, 1173, 3, 30317);
    			attr_dev(p7, "class", "white svelte-18zr5gz");
    			add_location(p7, file, 1188, 6, 31093);
    			attr_dev(input4, "id", "triggerInputMode");
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-18zr5gz");
    			add_location(input4, file, 1189, 6, 31133);
    			attr_dev(label2, "for", "triggerInputMode");
    			attr_dev(label2, "class", "checker input-mode svelte-18zr5gz");
    			add_location(label2, file, 1190, 6, 31223);
    			attr_dev(div12, "class", "margin-bottom alignment svelte-18zr5gz");
    			add_location(div12, file, 1187, 5, 31048);
    			attr_dev(div13, "class", "upinputmode svelte-18zr5gz");
    			add_location(div13, file, 1186, 4, 31016);
    			attr_dev(button3, "class", "input-text channelSelectOpen svelte-18zr5gz");
    			attr_dev(button3, "id", "roomSelectOpenButton");
    			add_location(button3, file, 1250, 5, 33993);
    			attr_dev(button4, "class", "input-text channelSelectOpen svelte-18zr5gz");
    			attr_dev(button4, "id", "channelSelectOpenButton");
    			add_location(button4, file, 1251, 5, 34133);
    			attr_dev(p8, "class", "white svelte-18zr5gz");
    			add_location(p8, file, 1253, 6, 34315);
    			attr_dev(div14, "class", "alignmentKey svelte-18zr5gz");
    			add_location(div14, file, 1252, 5, 34281);
    			if (img3.src !== (img3_src_value = "img/minmik.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "minMic svelte-18zr5gz");
    			attr_dev(img3, "alt", "minMic");
    			add_location(img3, file, 1258, 12, 34453);
    			attr_dev(th0, "class", "svelte-18zr5gz");
    			add_location(th0, file, 1258, 8, 34449);
    			attr_dev(p9, "class", "button-selection svelte-18zr5gz");
    			add_location(p9, file, 1259, 12, 34526);
    			attr_dev(th1, "class", "svelte-18zr5gz");
    			add_location(th1, file, 1259, 8, 34522);
    			set_style(button5, "--height", /*config*/ ctx[6].main.ki.global.height + "px");
    			set_style(button5, "--width", /*config*/ ctx[6].main.ki.global.width + "px");
    			set_style(button5, "--color", /*config*/ ctx[6].main.ki.global.color + "%");
    			attr_dev(button5, "class", button5_class_value = "inputbutton input-text " + (/*config*/ ctx[6].main.ki.global.select ? "bactive" : "") + " svelte-18zr5gz");
    			attr_dev(button5, "id", "kiGlobal");
    			button5.disabled = button5_disabled_value = /*config*/ ctx[6].main.ki.radio.on;
    			add_location(button5, file, 1260, 12, 34585);
    			attr_dev(th2, "class", "svelte-18zr5gz");
    			add_location(th2, file, 1260, 8, 34581);
    			attr_dev(tr0, "class", "svelte-18zr5gz");
    			add_location(tr0, file, 1257, 7, 34435);
    			if (img4.src !== (img4_src_value = "img/radio.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "minradio svelte-18zr5gz");
    			attr_dev(img4, "alt", "minradio");
    			add_location(img4, file, 1274, 12, 35135);
    			attr_dev(th3, "class", "svelte-18zr5gz");
    			add_location(th3, file, 1274, 8, 35131);
    			attr_dev(p10, "class", "button-selection svelte-18zr5gz");
    			add_location(p10, file, 1275, 12, 35211);
    			attr_dev(th4, "class", "svelte-18zr5gz");
    			add_location(th4, file, 1275, 8, 35207);
    			set_style(button6, "--height", /*config*/ ctx[6].main.ki.radio.height + "px");
    			set_style(button6, "--width", /*config*/ ctx[6].main.ki.radio.width + "px");
    			set_style(button6, "--color", /*config*/ ctx[6].main.ki.radio.color + "%");
    			attr_dev(button6, "class", button6_class_value = "inputbutton input-text " + (/*config*/ ctx[6].main.ki.radio.select ? "bactive" : "") + " svelte-18zr5gz");
    			attr_dev(button6, "id", "kiRadio");
    			button6.disabled = button6_disabled_value = /*config*/ ctx[6].main.ki.global.on;
    			add_location(button6, file, 1276, 12, 35278);
    			attr_dev(th5, "class", "svelte-18zr5gz");
    			add_location(th5, file, 1276, 8, 35274);
    			attr_dev(tr1, "class", "svelte-18zr5gz");
    			add_location(tr1, file, 1273, 7, 35117);
    			attr_dev(tbody, "class", "svelte-18zr5gz");
    			add_location(tbody, file, 1256, 6, 34419);
    			attr_dev(table, "class", "keyname-space-between svelte-18zr5gz");
    			add_location(table, file, 1255, 5, 34374);
    			attr_dev(div15, "class", "inline-block margin svelte-18zr5gz");
    			add_location(div15, file, 1249, 4, 33953);
    			attr_dev(div16, "class", "boxmodes box-flex svelte-18zr5gz");
    			add_location(div16, file, 1185, 3, 30979);
    			attr_dev(button7, "class", "button shadow closebuttonwidth svelte-18zr5gz");
    			add_location(button7, file, 1294, 4, 35886);
    			attr_dev(div17, "class", "boxmodes end svelte-18zr5gz");
    			add_location(div17, file, 1293, 3, 35854);
    			attr_dev(div18, "id", "container");
    			attr_dev(div18, "class", "svelte-18zr5gz");
    			add_location(div18, file, 1113, 2, 28057);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[36]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[36]),
    				listen_dev(input0, "input", /*input_handler*/ ctx[37], false, false, false),
    				listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[38]),
    				listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[38]),
    				listen_dev(input1, "input", /*input_handler_1*/ ctx[39], false, false, false),
    				listen_dev(button0, "click", /*click_handler_5*/ ctx[40], false, false, false),
    				listen_dev(button1, "click", /*click_handler_6*/ ctx[41], false, false, false),
    				listen_dev(button2, "click", /*click_handler_7*/ ctx[42], false, false, false),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[43]),
    				listen_dev(input2, "click", /*click_handler_8*/ ctx[44], false, false, false),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[45]),
    				listen_dev(input3, "click", /*click_handler_9*/ ctx[46], false, false, false),
    				listen_dev(input4, "change", /*input4_change_handler*/ ctx[47]),
    				listen_dev(button3, "click", /*click_handler_13*/ ctx[57], false, false, false),
    				listen_dev(button4, "click", /*click_handler_14*/ ctx[58], false, false, false),
    				listen_dev(button5, "click", /*click_handler_15*/ ctx[60], false, false, false),
    				listen_dev(button6, "click", /*click_handler_16*/ ctx[62], false, false, false),
    				listen_dev(button7, "click", /*closeMainWindow*/ ctx[14], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div18, anchor);
    			append_dev(div18, h1);
    			append_dev(h1, img0);
    			append_dev(div18, t0);
    			append_dev(div18, div6);
    			append_dev(div6, div2);
    			append_dev(div2, img1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*config*/ ctx[6].main.soundVolume);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(p1, t5);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, img2);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, p2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*config*/ ctx[6].main.microphoneVolume);
    			append_dev(div3, t10);
    			append_dev(div3, p3);
    			append_dev(p3, t11);
    			append_dev(div18, t12);
    			append_dev(div18, div8);
    			append_dev(div8, p4);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(div7, t16);
    			append_dev(div7, button1);
    			append_dev(div7, t18);
    			append_dev(div7, button2);
    			append_dev(div18, t20);
    			append_dev(div18, div11);
    			append_dev(div11, div9);
    			append_dev(div9, p5);
    			append_dev(div9, t22);
    			append_dev(div9, input2);
    			input2.checked = /*config*/ ctx[6].main.triggerOnOffSound;
    			append_dev(div9, t23);
    			append_dev(div9, label0);
    			append_dev(div11, t24);
    			append_dev(div11, div10);
    			append_dev(div10, p6);
    			append_dev(div10, t26);
    			append_dev(div10, input3);
    			input3.checked = /*config*/ ctx[6].main.triggerSound3D;
    			append_dev(div10, t27);
    			append_dev(div10, label1);
    			append_dev(div18, t28);
    			append_dev(div18, div16);
    			append_dev(div16, div13);
    			append_dev(div13, div12);
    			append_dev(div12, p7);
    			append_dev(div12, t30);
    			append_dev(div12, input4);
    			input4.checked = /*config*/ ctx[6].main.inputmode;
    			append_dev(div12, t31);
    			append_dev(div12, label2);
    			append_dev(div13, t32);
    			if (if_block) if_block.m(div13, null);
    			append_dev(div16, t33);
    			append_dev(div16, div15);
    			append_dev(div15, button3);
    			append_dev(div15, t35);
    			append_dev(div15, button4);
    			append_dev(div15, t37);
    			append_dev(div15, div14);
    			append_dev(div14, p8);
    			append_dev(div15, t39);
    			append_dev(div15, table);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, th0);
    			append_dev(th0, img3);
    			append_dev(tr0, t40);
    			append_dev(tr0, th1);
    			append_dev(th1, p9);
    			append_dev(tr0, t42);
    			append_dev(tr0, th2);
    			append_dev(th2, button5);
    			append_dev(button5, t43);
    			/*button5_binding*/ ctx[59](button5);
    			append_dev(tbody, t44);
    			append_dev(tbody, tr1);
    			append_dev(tr1, th3);
    			append_dev(th3, img4);
    			append_dev(tr1, t45);
    			append_dev(tr1, th4);
    			append_dev(th4, p10);
    			append_dev(tr1, t47);
    			append_dev(tr1, th5);
    			append_dev(th5, button6);
    			append_dev(button6, t48);
    			/*button6_binding*/ ctx[61](button6);
    			append_dev(div18, t49);
    			append_dev(div18, div17);
    			append_dev(div17, button7);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(input0, "--columns", /*config*/ ctx[6].main.soundVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_input_value(input0, /*config*/ ctx[6].main.soundVolume);
    			}

    			if ((!current || dirty[0] & /*config*/ 64) && t5_value !== (t5_value = /*config*/ ctx[6].main.soundVolume + "")) set_data_dev(t5, t5_value);

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(input1, "--columns", /*config*/ ctx[6].main.microphoneVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_input_value(input1, /*config*/ ctx[6].main.microphoneVolume);
    			}

    			if ((!current || dirty[0] & /*config*/ 64) && t11_value !== (t11_value = /*config*/ ctx[6].main.microphoneVolume + "")) set_data_dev(t11, t11_value);

    			if (dirty[0] & /*config*/ 64) {
    				input2.checked = /*config*/ ctx[6].main.triggerOnOffSound;
    			}

    			if (dirty[0] & /*config*/ 64) {
    				input3.checked = /*config*/ ctx[6].main.triggerSound3D;
    			}

    			if (dirty[0] & /*config*/ 64) {
    				input4.checked = /*config*/ ctx[6].main.inputmode;
    			}

    			if (!/*config*/ ctx[6].main.inputmode) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(div13, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || dirty[0] & /*config*/ 64) && t43_value !== (t43_value = /*config*/ ctx[6].main.ki.global.key + "")) set_data_dev(t43, t43_value);

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button5, "--height", /*config*/ ctx[6].main.ki.global.height + "px");
    			}

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button5, "--width", /*config*/ ctx[6].main.ki.global.width + "px");
    			}

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button5, "--color", /*config*/ ctx[6].main.ki.global.color + "%");
    			}

    			if (!current || dirty[0] & /*config*/ 64 && button5_class_value !== (button5_class_value = "inputbutton input-text " + (/*config*/ ctx[6].main.ki.global.select ? "bactive" : "") + " svelte-18zr5gz")) {
    				attr_dev(button5, "class", button5_class_value);
    			}

    			if (!current || dirty[0] & /*config*/ 64 && button5_disabled_value !== (button5_disabled_value = /*config*/ ctx[6].main.ki.radio.on)) {
    				prop_dev(button5, "disabled", button5_disabled_value);
    			}

    			if ((!current || dirty[0] & /*config*/ 64) && t48_value !== (t48_value = /*config*/ ctx[6].main.ki.radio.key + "")) set_data_dev(t48, t48_value);

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button6, "--height", /*config*/ ctx[6].main.ki.radio.height + "px");
    			}

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button6, "--width", /*config*/ ctx[6].main.ki.radio.width + "px");
    			}

    			if (!current || dirty[0] & /*config*/ 64) {
    				set_style(button6, "--color", /*config*/ ctx[6].main.ki.radio.color + "%");
    			}

    			if (!current || dirty[0] & /*config*/ 64 && button6_class_value !== (button6_class_value = "inputbutton input-text " + (/*config*/ ctx[6].main.ki.radio.select ? "bactive" : "") + " svelte-18zr5gz")) {
    				attr_dev(button6, "class", button6_class_value);
    			}

    			if (!current || dirty[0] & /*config*/ 64 && button6_disabled_value !== (button6_disabled_value = /*config*/ ctx[6].main.ki.global.on)) {
    				prop_dev(button6, "disabled", button6_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div18_transition) div18_transition = create_bidirectional_transition(div18, fade, {}, true);
    				div18_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div18_transition) div18_transition = create_bidirectional_transition(div18, fade, {}, false);
    			div18_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div18);
    			if (if_block) if_block.d();
    			/*button5_binding*/ ctx[59](null);
    			/*button6_binding*/ ctx[61](null);
    			if (detaching && div18_transition) div18_transition.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(1113:1) {#if gui.mainWindowOpen}",
    		ctx
    	});

    	return block;
    }

    // (1193:5) {#if !config.main.inputmode}
    function create_if_block_6(ctx) {
    	let div3;
    	let ul;
    	let li0;
    	let input0;
    	let input0_value_value;
    	let t0;
    	let label0;
    	let div0;
    	let t2;
    	let li1;
    	let input1;
    	let input1_value_value;
    	let t3;
    	let label1;
    	let div1;
    	let t5;
    	let li2;
    	let input2;
    	let input2_value_value;
    	let t6;
    	let label2;
    	let div2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			input0 = element("input");
    			t0 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "По голосу";
    			t2 = space();
    			li1 = element("li");
    			input1 = element("input");
    			t3 = space();
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "При удердании";
    			t5 = space();
    			li2 = element("li");
    			input2 = element("input");
    			t6 = space();
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Переключение по клавише";
    			attr_dev(input0, "type", "radio");
    			input0.__value = input0_value_value = 1;
    			input0.value = input0.__value;
    			attr_dev(input0, "id", "radio1");
    			attr_dev(input0, "name", "radio");
    			attr_dev(input0, "class", "input svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][0].push(input0);
    			add_location(input0, file, 1196, 8, 31438);
    			attr_dev(div0, "class", "button selector A svelte-18zr5gz");
    			add_location(div0, file, 1209, 22, 32123);
    			set_style(label0, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			set_style(label0, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			set_style(label0, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			attr_dev(label0, "for", "radio1");
    			attr_dev(label0, "class", "svelte-18zr5gz");
    			add_location(label0, file, 1198, 8, 31567);
    			attr_dev(li0, "class", "li svelte-18zr5gz");
    			add_location(li0, file, 1195, 7, 31413);
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 2;
    			input1.value = input1.__value;
    			attr_dev(input1, "id", "radio2");
    			attr_dev(input1, "name", "radio");
    			attr_dev(input1, "class", "input svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][0].push(input1);
    			add_location(input1, file, 1212, 8, 32225);
    			attr_dev(div1, "class", "button selector A svelte-18zr5gz");
    			add_location(div1, file, 1226, 22, 32967);
    			set_style(label1, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			set_style(label1, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			set_style(label1, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			attr_dev(label1, "for", "radio2");
    			attr_dev(label1, "class", "svelte-18zr5gz");
    			add_location(label1, file, 1215, 8, 32412);
    			attr_dev(li1, "class", "li svelte-18zr5gz");
    			add_location(li1, file, 1211, 7, 32200);
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 3;
    			input2.value = input2.__value;
    			attr_dev(input2, "id", "radio3");
    			attr_dev(input2, "name", "radio");
    			attr_dev(input2, "class", "input svelte-18zr5gz");
    			/*$$binding_groups*/ ctx[27][0].push(input2);
    			add_location(input2, file, 1229, 8, 33073);
    			attr_dev(div2, "class", "button selector A svelte-18zr5gz");
    			add_location(div2, file, 1243, 22, 33815);
    			set_style(label2, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			set_style(label2, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			set_style(label2, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			attr_dev(label2, "for", "radio3");
    			attr_dev(label2, "class", "svelte-18zr5gz");
    			add_location(label2, file, 1232, 8, 33260);
    			attr_dev(li2, "class", "li svelte-18zr5gz");
    			add_location(li2, file, 1228, 7, 33048);
    			attr_dev(ul, "class", "ul svelte-18zr5gz");
    			add_location(ul, file, 1194, 6, 31389);
    			attr_dev(div3, "id", "inputmode");
    			attr_dev(div3, "class", "inputmode svelte-18zr5gz");
    			add_location(div3, file, 1193, 5, 31343);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[48]),
    				listen_dev(label0, "click", /*click_handler_10*/ ctx[50], false, false, false),
    				listen_dev(
    					input1,
    					"click",
    					function () {
    						if (is_function(/*config*/ ctx[6].main.inputmodeon.click = true)) (/*config*/ ctx[6].main.inputmodeon.click = true).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[51]),
    				listen_dev(label1, "click", /*click_handler_11*/ ctx[53], false, false, false),
    				listen_dev(
    					input2,
    					"click",
    					function () {
    						if (is_function(/*config*/ ctx[6].main.inputmodeon.click = true)) (/*config*/ ctx[6].main.inputmodeon.click = true).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(input2, "change", /*input2_change_handler_1*/ ctx[54]),
    				listen_dev(label2, "click", /*click_handler_12*/ ctx[56], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			input0.checked = input0.__value === /*config*/ ctx[6].main.inputModeRadio;
    			append_dev(li0, t0);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			/*label0_binding*/ ctx[49](label0);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			input1.checked = input1.__value === /*config*/ ctx[6].main.inputModeRadio;
    			append_dev(li1, t3);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			/*label1_binding*/ ctx[52](label1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			input2.checked = input2.__value === /*config*/ ctx[6].main.inputModeRadio;
    			append_dev(li2, t6);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    			/*label2_binding*/ ctx[55](label2);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*config*/ 64) {
    				input0.checked = input0.__value === /*config*/ ctx[6].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label0, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label0, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label0, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				input1.checked = input1.__value === /*config*/ ctx[6].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label1, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label1, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label1, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				input2.checked = input2.__value === /*config*/ ctx[6].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label2, "--height", /*config*/ ctx[6].main.inputmodeon.height + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label2, "--width", /*config*/ ctx[6].main.inputmodeon.width + "px");
    			}

    			if (dirty[0] & /*config*/ 64) {
    				set_style(label2, "--color", /*config*/ ctx[6].main.inputmodeon.color + "%");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*$$binding_groups*/ ctx[27][0].splice(/*$$binding_groups*/ ctx[27][0].indexOf(input0), 1);
    			/*label0_binding*/ ctx[49](null);
    			/*$$binding_groups*/ ctx[27][0].splice(/*$$binding_groups*/ ctx[27][0].indexOf(input1), 1);
    			/*label1_binding*/ ctx[52](null);
    			/*$$binding_groups*/ ctx[27][0].splice(/*$$binding_groups*/ ctx[27][0].indexOf(input2), 1);
    			/*label2_binding*/ ctx[55](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(1193:5) {#if !config.main.inputmode}",
    		ctx
    	});

    	return block;
    }

    // (1305:3) {#if room != undefined}
    function create_if_block_2(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let img;
    	let img_src_value;
    	let t0;
    	let th1;
    	let p;
    	let t1_value = /*room*/ ctx[64].name + "";
    	let t1;
    	let t2;
    	let tbody;
    	let t3;
    	let each_value_1 = /*volumeWindowPlayer*/ ctx[8];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			img = element("img");
    			t0 = space();
    			th1 = element("th");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayRadiomin ower svelte-18zr5gz");
    			if (img.src !== (img_src_value = "img/radiomin.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayRadiomin");
    			add_location(img, file, 1308, 24, 36342);
    			attr_dev(th0, "class", "ower svelte-18zr5gz");
    			add_location(th0, file, 1308, 7, 36325);
    			attr_dev(p, "class", "owerlayRoomName ower svelte-18zr5gz");
    			attr_dev(p, "id", "owerlayRoomName");
    			add_location(p, file, 1309, 24, 36470);
    			attr_dev(th1, "class", "ower svelte-18zr5gz");
    			add_location(th1, file, 1309, 7, 36453);
    			attr_dev(tr, "class", "svelte-18zr5gz");
    			add_location(tr, file, 1307, 6, 36312);
    			attr_dev(thead, "class", "ower svelte-18zr5gz");
    			add_location(thead, file, 1306, 5, 36284);
    			attr_dev(tbody, "class", "svelte-18zr5gz");
    			add_location(tbody, file, 1312, 5, 36578);
    			attr_dev(table, "class", "ower svelte-18zr5gz");
    			add_location(table, file, 1305, 4, 36257);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(th0, img);
    			append_dev(tr, t0);
    			append_dev(tr, th1);
    			append_dev(th1, p);
    			append_dev(p, t1);
    			append_dev(table, t2);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(table, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowRoom*/ 128 && t1_value !== (t1_value = /*room*/ ctx[64].name + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*volumeWindowPlayer*/ 256) {
    				each_value_1 = /*volumeWindowPlayer*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(1305:3) {#if room != undefined}",
    		ctx
    	});

    	return block;
    }

    // (1315:7) {#if players.room == id && players.talk}
    function create_if_block_3(ctx) {
    	let tr;
    	let th0;
    	let img;
    	let img_src_value;
    	let t0;
    	let th1;
    	let p0;
    	let t1_value = /*players*/ ctx[67].name + "";
    	let t1;
    	let t2;
    	let th2;
    	let p1;
    	let t3;

    	function select_block_type(ctx, dirty) {
    		if (/*players*/ ctx[67].text != undefined) return create_if_block_4;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th0 = element("th");
    			img = element("img");
    			t0 = space();
    			th1 = element("th");
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			th2 = element("th");
    			p1 = element("p");
    			if_block.c();
    			t3 = space();
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayRadiominImg ower svelte-18zr5gz");
    			if (img.src !== (img_src_value = "img/owerlayVolume.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayRadiomin");
    			add_location(img, file, 1316, 26, 36721);
    			attr_dev(th0, "class", "ower svelte-18zr5gz");
    			add_location(th0, file, 1316, 9, 36704);
    			attr_dev(p0, "class", "owerlayPlayer ower svelte-18zr5gz");
    			attr_dev(p0, "id", "owerlayPlayer");
    			add_location(p0, file, 1317, 26, 36859);
    			attr_dev(th1, "class", "ower svelte-18zr5gz");
    			add_location(th1, file, 1317, 9, 36842);
    			attr_dev(p1, "class", "owerlayPlayerDistance ower svelte-18zr5gz");
    			attr_dev(p1, "id", "owerlayPlayerDistance");
    			add_location(p1, file, 1318, 26, 36959);
    			attr_dev(th2, "class", "ower svelte-18zr5gz");
    			add_location(th2, file, 1318, 9, 36942);
    			attr_dev(tr, "class", "svelte-18zr5gz");
    			add_location(tr, file, 1315, 8, 36689);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th0);
    			append_dev(th0, img);
    			append_dev(tr, t0);
    			append_dev(tr, th1);
    			append_dev(th1, p0);
    			append_dev(p0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, th2);
    			append_dev(th2, p1);
    			if_block.m(p1, null);
    			append_dev(tr, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t1_value !== (t1_value = /*players*/ ctx[67].name + "")) set_data_dev(t1, t1_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1315:7) {#if players.room == id && players.talk}",
    		ctx
    	});

    	return block;
    }

    // (1322:9) {:else}
    function create_else_block_2(ctx) {
    	let t_value = /*players*/ ctx[67].distance + "m." + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t_value !== (t_value = /*players*/ ctx[67].distance + "m." + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(1322:9) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1320:9) {#if players.text != undefined}
    function create_if_block_4(ctx) {
    	let t_value = /*players*/ ctx[67].text + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 256 && t_value !== (t_value = /*players*/ ctx[67].text + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(1320:9) {#if players.text != undefined}",
    		ctx
    	});

    	return block;
    }

    // (1314:6) {#each volumeWindowPlayer as players}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = /*players*/ ctx[67].room == /*id*/ ctx[66] && /*players*/ ctx[67].talk && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*players*/ ctx[67].room == /*id*/ ctx[66] && /*players*/ ctx[67].talk) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(1314:6) {#each volumeWindowPlayer as players}",
    		ctx
    	});

    	return block;
    }

    // (1304:2) {#each volumeWindowRoom as room,id}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*room*/ ctx[64] != undefined && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*room*/ ctx[64] != undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(1304:2) {#each volumeWindowRoom as room,id}",
    		ctx
    	});

    	return block;
    }

    // (1342:1) {:else}
    function create_else_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayMicrophone svelte-18zr5gz");
    			attr_dev(img, "id", "owerlayMicrophone");
    			if (img.src !== (img_src_value = "img/owerlayMicrophoneOff.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayMicrophone");
    			set_style(img, "--left", /*move*/ ctx[10].owerlayMicrophone.left + "px");
    			set_style(img, "--top", /*move*/ ctx[10].owerlayMicrophone.top + "px");
    			add_location(img, file, 1342, 2, 37582);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--left", /*move*/ ctx[10].owerlayMicrophone.left + "px");
    			}

    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--top", /*move*/ ctx[10].owerlayMicrophone.top + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(1342:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1334:1) {#if !move.owerlayMicrophone.click}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayMicrophone svelte-18zr5gz");
    			attr_dev(img, "id", "owerlayMicrophone");
    			if (img.src !== (img_src_value = "img/owerlayMicrophone.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayMicrophone");
    			set_style(img, "--left", /*move*/ ctx[10].owerlayMicrophone.left + "px");
    			set_style(img, "--top", /*move*/ ctx[10].owerlayMicrophone.top + "px");
    			add_location(img, file, 1334, 2, 37326);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--left", /*move*/ ctx[10].owerlayMicrophone.left + "px");
    			}

    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--top", /*move*/ ctx[10].owerlayMicrophone.top + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(1334:1) {#if !move.owerlayMicrophone.click}",
    		ctx
    	});

    	return block;
    }

    // (1359:1) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayVolumeOn svelte-18zr5gz");
    			attr_dev(img, "id", "owerlayVolumeOn");
    			if (img.src !== (img_src_value = "img/owerlayVolumeOff.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayVolumeOn");
    			set_style(img, "--left", /*move*/ ctx[10].owerlayVolumeOn.left + "px");
    			set_style(img, "--top", /*move*/ ctx[10].owerlayVolumeOn.top + "px");
    			add_location(img, file, 1359, 2, 38119);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--left", /*move*/ ctx[10].owerlayVolumeOn.left + "px");
    			}

    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--top", /*move*/ ctx[10].owerlayVolumeOn.top + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(1359:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1351:1) {#if !move.owerlayVolumeOn.click}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "owerlayVolumeOn svelte-18zr5gz");
    			attr_dev(img, "id", "owerlayVolumeOn");
    			if (img.src !== (img_src_value = "img/owerlayVolumeOn.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayVolumeOn");
    			set_style(img, "--left", /*move*/ ctx[10].owerlayVolumeOn.left + "px");
    			set_style(img, "--top", /*move*/ ctx[10].owerlayVolumeOn.top + "px");
    			add_location(img, file, 1351, 2, 37875);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--left", /*move*/ ctx[10].owerlayVolumeOn.left + "px");
    			}

    			if (dirty[0] & /*move*/ 1024) {
    				set_style(img, "--top", /*move*/ ctx[10].owerlayVolumeOn.top + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1351:1) {#if !move.owerlayVolumeOn.click}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div0;
    	let t6;
    	let t7;
    	let current;
    	let dispose;
    	let if_block0 = /*gui*/ ctx[9].deviceSelectOpen && create_if_block_14(ctx);
    	let if_block1 = /*gui*/ ctx[9].mutList && create_if_block_13(ctx);
    	let if_block2 = /*gui*/ ctx[9].roomSelectOpen && create_if_block_12(ctx);
    	let if_block3 = /*gui*/ ctx[9].channelSelectOpen && create_if_block_11(ctx);
    	let if_block4 = /*gui*/ ctx[9].volumeMainWindow && create_if_block_7(ctx);
    	let if_block5 = /*gui*/ ctx[9].mainWindowOpen && create_if_block_5(ctx);
    	let each_value = /*volumeWindowRoom*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (!/*move*/ ctx[10].owerlayMicrophone.click) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block6 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*move*/ ctx[10].owerlayVolumeOn.click) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block7 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			if_block6.c();
    			t7 = space();
    			if_block7.c();
    			attr_dev(div0, "id", "owerlay");
    			attr_dev(div0, "class", "owerlay ower svelte-18zr5gz");
    			set_style(div0, "--left", /*move*/ ctx[10].owerlay.left + "px");
    			set_style(div0, "--top", /*move*/ ctx[10].owerlay.top + "px");
    			set_style(div0, "background-color", /*move*/ ctx[10].background);
    			add_location(div0, file, 1298, 1, 36008);
    			attr_dev(div1, "id", "mainWindow");
    			set_style(div1, "background-image", "url(img/dsfghdfshsdg.png)");
    			attr_dev(div1, "oncontextmenu", "return false");
    			attr_dev(div1, "class", "svelte-18zr5gz");
    			add_location(div1, file, 983, 0, 21716);

    			dispose = [
    				listen_dev(window_1, "mousemove", /*mousemove_handler*/ ctx[24], false, false, false),
    				listen_dev(window_1, "mousedown", /*mousedown_handler*/ ctx[25], false, false, false),
    				listen_dev(window_1, "mouseup", /*onMouseUp*/ ctx[17], false, false, false),
    				listen_dev(window_1, "keydown", /*keydown*/ ctx[12], false, false, false),
    				listen_dev(window_1, "keyup", /*keyup*/ ctx[13], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t0);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t2);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block4) if_block4.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block5) if_block5.m(div1, null);
    			append_dev(div1, t5);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[63](div0);
    			append_dev(div1, t6);
    			if_block6.m(div1, null);
    			append_dev(div1, t7);
    			if_block7.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*gui*/ ctx[9].deviceSelectOpen) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_14(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*gui*/ ctx[9].mutList) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_13(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*gui*/ ctx[9].roomSelectOpen) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_12(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div1, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*gui*/ ctx[9].channelSelectOpen) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    					transition_in(if_block3, 1);
    				} else {
    					if_block3 = create_if_block_11(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div1, t3);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*gui*/ ctx[9].volumeMainWindow) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    					transition_in(if_block4, 1);
    				} else {
    					if_block4 = create_if_block_7(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div1, t4);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (/*gui*/ ctx[9].mainWindowOpen) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    					transition_in(if_block5, 1);
    				} else {
    					if_block5 = create_if_block_5(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(div1, t5);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*volumeWindowRoom, volumeWindowPlayer*/ 384) {
    				each_value = /*volumeWindowRoom*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty[0] & /*move*/ 1024) {
    				set_style(div0, "--left", /*move*/ ctx[10].owerlay.left + "px");
    			}

    			if (!current || dirty[0] & /*move*/ 1024) {
    				set_style(div0, "--top", /*move*/ ctx[10].owerlay.top + "px");
    			}

    			if (!current || dirty[0] & /*move*/ 1024) {
    				set_style(div0, "background-color", /*move*/ ctx[10].background);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(div1, t7);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block7) {
    				if_block7.p(ctx, dirty);
    			} else {
    				if_block7.d(1);
    				if_block7 = current_block_type_1(ctx);

    				if (if_block7) {
    					if_block7.c();
    					if_block7.m(div1, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[63](null);
    			if_block6.d();
    			if_block7.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let canvas;
    	let owerlay;
    	let global;
    	let radio;
    	let radioInput0;
    	let radioInput1;
    	let radioInput2;

    	onMount(() => {
    		let frame;
    		let i = 0;

    		(function loop() {
    			frame = requestAnimationFrame(loop);

    			if (move.owerlay.move && i < 0.457) {
    				i += 0.005;
    				$$invalidate(10, move.background = "rgba(255, 255, 255, " + i + ")", move);
    			} else if (!move.owerlay.move && i > 0) {
    				i -= 0.005;
    				$$invalidate(10, move.background = "rgba(255, 255, 255, " + i + ")", move);
    			}

    			

    			if (config.main.ki.global.select) {
    				$$invalidate(6, config.main.ki.global.color += 5, config);
    			} else {
    				$$invalidate(6, config.main.ki.global.color = 5, config);
    			}

    			

    			if (config.main.ki.radio.select) {
    				$$invalidate(6, config.main.ki.radio.color += 5, config);
    			} else {
    				$$invalidate(6, config.main.ki.radio.color = 5, config);
    			}

    			

    			if (config.main.inputmodeon.click) {
    				$$invalidate(6, config.main.inputmodeon.click = false, config);
    				$$invalidate(6, config.main.inputmodeon.color = 5, config);
    			} else if (config.main.inputmodeon.color >= 5 && config.main.inputmodeon.color < 100) {
    				$$invalidate(6, config.main.inputmodeon.color += 5, config);
    			}

    			
    		})();

    		return () => {
    			cancelAnimationFrame(frame);
    		};
    	});

    	const config = {
    		main: {
    			soundVolume: 50,
    			soundVolumeOff: 50,
    			microphoneVolume: 50,
    			microphoneVolumeOff: 50,
    			triggerOnOffSound: true,
    			triggerSound3D: true,
    			inputmode: false,
    			inputmodeon: {
    				click: false,
    				height: 10,
    				width: 10,
    				color: 5
    			},
    			inputModeRadio: 1,
    			inputModeRadioDevice: 1,
    			ki: {
    				global: {
    					key: "A",
    					on: false,
    					select: false,
    					height: 10,
    					width: 10,
    					color: 5
    				},
    				radio: {
    					key: "B",
    					on: false,
    					select: false,
    					height: 10,
    					width: 10,
    					color: 5
    				}
    			}
    		},
    		selectDevice: 0,
    		device: ["microphone1", "microphone2", "microphone3", "microphone4", "microphone5"],
    		selectRoom: 0,
    		room: ["Room1", "Room2", "Room3", "Room4"],
    		selectchannel: 0,
    		channel: ["Channel1", "Channel2", "Channel3", "Channel4"]
    	};

    	const mutList = ["Vf", "Vf1", "Vf2", "Vf3", "Vf4", "Vf5"];
    	const volumeWindowRoom = [];

    	const volumeWindowPlayer = [
    		{
    			name: "Vf1",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf2",
    			room: 0,
    			value: 50,
    			distance: 10,
    			talk: true
    		},
    		{
    			name: "Vf3",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf4",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf5",
    			room: 0,
    			value: 50,
    			distance: 200,
    			talk: true
    		},
    		{
    			name: "Vf6",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false,
    			text: "[text]"
    		},
    		{
    			name: "Vf7",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf8",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf9",
    			room: 1,
    			value: 50,
    			distance: 50,
    			talk: true,
    			text: "[text]"
    		},
    		{
    			name: "Vf10",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf11",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf12",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: true
    		},
    		{
    			name: "Vf13",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf14",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf15",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		}
    	];

    	const gui = {
    		mainWindowOpen: true,
    		deviceSelectOpen: false,
    		roomSelectOpen: false,
    		channelSelectOpen: false,
    		mutList: false,
    		volumeMainWindow: false
    	};

    	const move = {
    		nowMove: "",
    		ismove: false,
    		domove: false,
    		background: "",
    		elem: { shiftX: 0, shiftY: 0 },
    		owerlay: { move: false, left: 330, top: 18 },
    		owerlayMicrophone: { click: false, left: 78, top: 20 },
    		owerlayVolumeOn: { click: false, left: 25, top: 19 }
    	};

    	presentation();

    	function presentation() {
    		addRoom("Общий");
    		addRoom("Рация1");
    		addRoom("Рация2");
    		addRoom("Рация3");
    		addRoom("Рация4");
    		deleteRoom(3);
    	}

    	

    	function addRoom(roomID) {
    		volumeWindowRoom.push({ name: roomID, open: true });
    	}

    	

    	function deleteRoom(roomID) {
    		delete volumeWindowRoom[roomID];
    	}

    	

    	function keydown(event) {
    		if (gui.mainWindowOpen == false && event.key == "Insert") {
    			openMainWindow();
    		} else if (gui.mainWindowOpen == true && (event.key == "Escape" || event.key == "Insert")) {
    			closeMainWindow();
    		}

    		
    		let key = event.key;
    		key = key.length == 1 ? key.toUpperCase() : key;

    		if (config.main.ki.global.select) {
    			$$invalidate(6, config.main.ki.global.key = key, config);
    			$$invalidate(6, config.main.ki.global.select = false, config);
    		} else if (config.main.ki.radio.select) {
    			$$invalidate(6, config.main.ki.radio.key = key, config);
    			$$invalidate(6, config.main.ki.radio.select = false, config);
    		} else if (!config.main.ki.global.on && key == config.main.ki.global.key && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3)) {
    			$$invalidate(6, config.main.ki.global.on = true, config);
    			console.log("Говорю!");
    		} else if (config.main.ki.global.on && key == config.main.ki.global.key && config.main.inputModeRadio == 3) {
    			$$invalidate(6, config.main.ki.global.on = false, config);
    			console.log("Не говорю!");
    		} else if (!config.main.ki.radio.on && key == config.main.ki.radio.key && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3)) {
    			$$invalidate(6, config.main.ki.radio.on = true, config);
    			console.log("Говорю в рацию!");
    		} else if (config.main.ki.radio.on && key == config.main.ki.radio.key && config.main.inputModeRadio == 3) {
    			$$invalidate(6, config.main.ki.radio.on = false, config);
    			console.log("Не говорю в рацию!");
    		}
    	}

    	

    	function keyup(event) {
    		let key = event.key;
    		key = key.length == 1 ? key.toUpperCase() : key;

    		if (config.main.ki.global.on && key == config.main.ki.global.key && config.main.inputModeRadio == 2) {
    			$$invalidate(6, config.main.ki.global.on = false, config);
    			console.log("Не говорю!");
    		} else if (config.main.ki.radio.on && key == config.main.ki.radio.key && config.main.inputModeRadio == 2) {
    			$$invalidate(6, config.main.ki.radio.on = false, config);
    			console.log("Не говорю в рацию!");
    		}
    	}

    	function closeMainWindow() {
    		window.SetCursorVisible(false);
    		$$invalidate(9, gui.mainWindowOpen = false, gui);
    		$$invalidate(9, gui.deviceSelectOpen = false, gui);
    		$$invalidate(9, gui.roomSelectOpen = false, gui);
    		$$invalidate(9, gui.channelSelectOpen = false, gui);
    		$$invalidate(9, gui.mutList = false, gui);
    		$$invalidate(9, gui.volumeMainWindow = false, gui);
    	}

    	

    	function openMainWindow() {
    		window.SetCursorVisible(true);
    		$$invalidate(9, gui.mainWindowOpen = true, gui);
    	}

    	

    	function onMouseDown(event) {
    		let arr = event.target.classList;
    		let iterator = arr.values();

    		if (event.which == 1) {
    			$$invalidate(10, move.nowMove = event.target.id, move);
    			let id = event.target.id;

    			for (var value of iterator) {
    				if (value == "ower" || id == "owerlay") {
    					$$invalidate(10, move.nowMove = "owerlay", move);
    					$$invalidate(10, move.elem.shiftX = event.clientX - owerlay.getBoundingClientRect().left, move);
    					$$invalidate(10, move.elem.shiftY = event.clientY - owerlay.getBoundingClientRect().top, move);
    					$$invalidate(10, move.ismove = true, move);
    					$$invalidate(10, move.owerlay.move = true, move);
    				}
    			}

    			if (id == "owerlayMicrophone" || id == "owerlayVolumeOn") {
    				$$invalidate(10, move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left, move);
    				$$invalidate(10, move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top, move);
    				$$invalidate(10, move.ismove = true, move);
    			}
    		}
    	}

    	

    	function onMouseMove(event) {
    		if (move.ismove) {
    			switch (move.nowMove) {
    				case "owerlay":
    					{
    						$$invalidate(10, move.owerlay.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(10, move.owerlay.top = event.pageY - move.elem.shiftY, move);
    						break;
    					}
    					
    				case "owerlayVolumeOn":
    					{
    						$$invalidate(10, move.owerlayVolumeOn.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(10, move.owerlayVolumeOn.top = event.pageY - move.elem.shiftY, move);
    						$$invalidate(10, move.domove = true, move);
    						break;
    					}
    					
    				case "owerlayMicrophone":
    					{
    						$$invalidate(10, move.owerlayMicrophone.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(10, move.owerlayMicrophone.top = event.pageY - move.elem.shiftY, move);
    						$$invalidate(10, move.domove = true, move);
    						break;
    					}
    					
    			}
    		}
    	}

    	

    	function onMouseUp() {
    		if (!move.domove) {
    			switch (move.nowMove) {
    				case "owerlayVolumeOn":
    					{
    						if (move.owerlayVolumeOn.click) {
    							$$invalidate(10, move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click, move);
    							$$invalidate(6, config.main.soundVolume = config.main.soundVolumeOff, config);
    						} else {
    							$$invalidate(10, move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click, move);
    							$$invalidate(6, config.main.soundVolumeOff = config.main.soundVolume, config);
    							$$invalidate(6, config.main.soundVolume = 0, config);
    						}

    						break;
    					}
    					
    				case "owerlayMicrophone":
    					{
    						if (move.owerlayMicrophone.click) {
    							$$invalidate(10, move.owerlayMicrophone.click = !move.owerlayMicrophone.click, move);
    							$$invalidate(6, config.main.microphoneVolume = config.main.microphoneVolumeOff, config);
    						} else {
    							$$invalidate(10, move.owerlayMicrophone.click = !move.owerlayMicrophone.click, move);
    							$$invalidate(6, config.main.microphoneVolumeOff = config.main.microphoneVolume, config);
    							$$invalidate(6, config.main.microphoneVolume = 0, config);
    						}

    						break;
    					}
    					
    			}
    		}

    		$$invalidate(10, move.ismove = false, move);
    		$$invalidate(10, move.domove = false, move);
    		$$invalidate(10, move.owerlay.move = false, move);
    	}

    	

    	function battonSelect(event) {
    		if (event.target.id == "kiGlobal") {
    			$$invalidate(6, config.main.ki.global.select = true, config);
    			$$invalidate(6, config.main.ki.global.height = event.clientX - global.getBoundingClientRect().x, config);
    			$$invalidate(6, config.main.ki.global.width = event.clientY - global.getBoundingClientRect().y, config);
    		} else if (event.target.id == "kiRadio") {
    			$$invalidate(6, config.main.ki.radio.select = true, config);
    			$$invalidate(6, config.main.ki.radio.height = event.clientX - radio.getBoundingClientRect().x, config);
    			$$invalidate(6, config.main.ki.radio.width = event.clientY - radio.getBoundingClientRect().y, config);
    		}
    	}

    	const $$binding_groups = [[], [], [], []];
    	const mousemove_handler = event => onMouseMove(event);
    	const mousedown_handler = event => onMouseDown(event);

    	function input_change_handler() {
    		config.selectDevice = this.__value;
    		$$invalidate(6, config);
    	}

    	const click_handler = () => $$invalidate(9, gui.deviceSelectOpen = false, gui);
    	const click_handler_1 = () => $$invalidate(9, gui.mutList = false, gui);

    	function input_change_handler_1() {
    		config.selectRoom = this.__value;
    		$$invalidate(6, config);
    	}

    	const click_handler_2 = () => $$invalidate(9, gui.roomSelectOpen = false, gui);

    	function input_change_handler_2() {
    		config.selectchannel = this.__value;
    		$$invalidate(6, config);
    	}

    	const click_handler_3 = () => $$invalidate(9, gui.channelSelectOpen = false, gui);

    	const click_handler_4 = room => {
    		$$invalidate(7, room.open = !room.open, volumeWindowRoom);
    	};

    	function input_change_input_handler(Player) {
    		Player.value = to_number(this.value);
    		$$invalidate(8, volumeWindowPlayer);
    	}

    	function input0_change_input_handler() {
    		config.main.soundVolume = to_number(this.value);
    		$$invalidate(6, config);
    	}

    	const input_handler = () => {
    		window.SetPlayVolume(config.main.soundVolume / 100);

    		if (move.owerlayVolumeOn.click) {
    			$$invalidate(10, move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click, move);
    		}
    	};

    	function input1_change_input_handler() {
    		config.main.microphoneVolume = to_number(this.value);
    		$$invalidate(6, config);
    	}

    	const input_handler_1 = () => {
    		window.SetRecordVolume(config.main.microphoneVolume / 100);

    		if (move.owerlayMicrophone.click) {
    			$$invalidate(10, move.owerlayMicrophone.click = !move.owerlayMicrophone.click, move);
    		}
    	};

    	const click_handler_5 = () => $$invalidate(9, gui.deviceSelectOpen = true, gui);
    	const click_handler_6 = () => $$invalidate(9, gui.mutList = true, gui);
    	const click_handler_7 = () => $$invalidate(9, gui.volumeMainWindow = true, gui);

    	function input2_change_handler() {
    		config.main.triggerOnOffSound = this.checked;
    		$$invalidate(6, config);
    	}

    	const click_handler_8 = () => window.EnableVoice(config.main.triggerOnOffSound);

    	function input3_change_handler() {
    		config.main.triggerSound3D = this.checked;
    		$$invalidate(6, config);
    	}

    	const click_handler_9 = () => window.enable_3d_voice(config.main.triggerSound3D);

    	function input4_change_handler() {
    		config.main.inputmode = this.checked;
    		$$invalidate(6, config);
    	}

    	function input0_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(6, config);
    	}

    	function label0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, radioInput0 = $$value);
    		});
    	}

    	const click_handler_10 = event => {
    		$$invalidate(6, config.main.inputmodeon.height = event.clientX - radioInput0.getBoundingClientRect().x, config);
    		$$invalidate(6, config.main.inputmodeon.width = event.clientY - radioInput0.getBoundingClientRect().y, config);
    		$$invalidate(6, config.main.inputmodeon.click = true, config);
    	};

    	function input1_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(6, config);
    	}

    	function label1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, radioInput1 = $$value);
    		});
    	}

    	const click_handler_11 = event => {
    		$$invalidate(6, config.main.inputmodeon.height = event.clientX - radioInput1.getBoundingClientRect().x, config);
    		$$invalidate(6, config.main.inputmodeon.width = event.clientY - radioInput1.getBoundingClientRect().y, config);
    		$$invalidate(6, config.main.inputmodeon.click = true, config);
    	};

    	function input2_change_handler_1() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(6, config);
    	}

    	function label2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, radioInput2 = $$value);
    		});
    	}

    	const click_handler_12 = event => {
    		$$invalidate(6, config.main.inputmodeon.height = event.clientX - radioInput2.getBoundingClientRect().x, config);
    		$$invalidate(6, config.main.inputmodeon.width = event.clientY - radioInput2.getBoundingClientRect().y, config);
    		$$invalidate(6, config.main.inputmodeon.click = true, config);
    	};

    	const click_handler_13 = () => $$invalidate(9, gui.roomSelectOpen = true, gui);
    	const click_handler_14 = () => $$invalidate(9, gui.channelSelectOpen = true, gui);

    	function button5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, global = $$value);
    		});
    	}

    	const click_handler_15 = event => battonSelect(event);

    	function button6_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, radio = $$value);
    		});
    	}

    	const click_handler_16 = event => battonSelect(event);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, owerlay = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("canvas" in $$props) canvas = $$props.canvas;
    		if ("owerlay" in $$props) $$invalidate(0, owerlay = $$props.owerlay);
    		if ("global" in $$props) $$invalidate(1, global = $$props.global);
    		if ("radio" in $$props) $$invalidate(2, radio = $$props.radio);
    		if ("radioInput0" in $$props) $$invalidate(3, radioInput0 = $$props.radioInput0);
    		if ("radioInput1" in $$props) $$invalidate(4, radioInput1 = $$props.radioInput1);
    		if ("radioInput2" in $$props) $$invalidate(5, radioInput2 = $$props.radioInput2);
    	};

    	return [
    		owerlay,
    		global,
    		radio,
    		radioInput0,
    		radioInput1,
    		radioInput2,
    		config,
    		volumeWindowRoom,
    		volumeWindowPlayer,
    		gui,
    		move,
    		mutList,
    		keydown,
    		keyup,
    		closeMainWindow,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		battonSelect,
    		canvas,
    		presentation,
    		addRoom,
    		deleteRoom,
    		openMainWindow,
    		mousemove_handler,
    		mousedown_handler,
    		input_change_handler,
    		$$binding_groups,
    		click_handler,
    		click_handler_1,
    		input_change_handler_1,
    		click_handler_2,
    		input_change_handler_2,
    		click_handler_3,
    		click_handler_4,
    		input_change_input_handler,
    		input0_change_input_handler,
    		input_handler,
    		input1_change_input_handler,
    		input_handler_1,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		input2_change_handler,
    		click_handler_8,
    		input3_change_handler,
    		click_handler_9,
    		input4_change_handler,
    		input0_change_handler,
    		label0_binding,
    		click_handler_10,
    		input1_change_handler,
    		label1_binding,
    		click_handler_11,
    		input2_change_handler_1,
    		label2_binding,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		button5_binding,
    		click_handler_15,
    		button6_binding,
    		click_handler_16,
    		div0_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
