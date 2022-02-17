
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
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
        const doc = get_root_for_style(node);
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = append_empty_stylesheet(node).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
            const d = (program.b - t);
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
            if (running_program || pending_program) {
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    class Clock {
        constructor(hour, minute) {
            
            this.Hour = hour;
            this.Minute = minute;
            
            this.AlarmHour = null;
            this.AlarmMinute = null;
            
            this.alarmIsActive = false;
            this.alarmTriggered = false;

            this.hexTime = "#000000";

            if (hour >= 24 || hour < 0) {
                throw RangeError("hour value must be >= 0 and < 24");
            }
            
            if (minute >= 60 || minute < 0) { 
                throw RangeError("minute value must be >= 0 and < 60");
            }
        }
        
        tick() {    
            
            this.Minute += 1;
            
            if (this.Minute == 60) {
                this.Hour += 1;
                this.Minute = 0;
            }
            if (this.Hour == 24) {
                this.Hour = 0;
            }

            console.log(this.Result(this.Hour) + ":" + this.Result(this.Minute));

            if (this.AlarmHour <= 23 && this.AlarmHour >= 0 && this.AlarmMinute <= 59 && this.AlarmMinute >= 0) {
                if (this.AlarmHour !=  null && this.AlarmMinute != null) {
                    if (this.AlarmHour == this.Hour && this.AlarmMinute == this.Minute) {
                        if (this.alarmIsActive == true) {
                            console.log("Alarm!!!");
                            this.alarmTriggered = true;
                        }
                    } 
                }
            }
            this.timeAsHex();
        }

        IfAlarmIsTriggered() {
            if (this.AlarmHour <= 23 && this.AlarmHour >= 0 && this.AlarmMinute <= 59 && this.AlarmMinute >= 0) {
                if (this.AlarmHour !=  null && this.AlarmMinute != null) {
                    if (this.AlarmHour <= this.Hour && this.AlarmMinute <= this.Minute) {
                        if (this.alarmIsActive == true) {
                            this.alarmTriggered = true;
                            console.log("Hasbulla is here");
                        }
                    } 
                }
            }
            return false
        }

        Result(num) {
            if (num < 10) {
                return "0" + num
            } else {
                return num
            }
        }
        
        setAlarm(AlarmHour, AlarmMinute) {
            this.AlarmHour = AlarmHour;
            this.AlarmMinute = AlarmMinute;  
            this.alarmIsActive = true;
        }
        
        activateAlarm() {
            this.alarmIsActive = true;
        }

        deactivateAlarm() {
            this.alarmIsActive = false;
            this.alarmTriggered = false;
        }

        resetAlarm() {
            this.alarmTriggered = false;
        }
        
        timeAsHex() {

            this.hexTime = `#${this.Result(this.Hour)}${this.Result(this.Minute)}00`;
        }

    }

    /* src\App.svelte generated by Svelte v3.44.1 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (16:2) {#if clock.alarmTriggered}
    function create_if_block(ctx) {
    	let p;
    	let p_transition;
    	let current;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "WAKE UP!!!";
    			attr_dev(p, "class", "text svelte-qr9byi");
    			add_location(p, file, 16, 9, 273);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!p_transition) p_transition = create_bidirectional_transition(p, fade, {}, true);
    				p_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!p_transition) p_transition = create_bidirectional_transition(p, fade, {}, false);
    			p_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching && p_transition) p_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:2) {#if clock.alarmTriggered}",
    		ctx
    	});

    	return block;
    }

    // (42:5) {#each [1, 2, 3, 4] as offset}
    function create_each_block_3(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			set_style(line, "stroke", "#254E99");
    			set_style(line, "stroke-width", "1px");
    			attr_dev(line, "y1", "28");
    			attr_dev(line, "y2", "30");
    			attr_dev(line, "transform", "rotate(" + 6 * (/*minutes*/ ctx[4] + /*offset*/ ctx[7]) + ")");
    			add_location(line, file, 42, 6, 1284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(42:5) {#each [1, 2, 3, 4] as offset}",
    		ctx
    	});

    	return block;
    }

    // (35:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minutes}
    function create_each_block_2(ctx) {
    	let line;
    	let each_1_anchor;
    	let each_value_3 = [1, 2, 3, 4];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			line = svg_element("line");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			set_style(line, "stroke", "#E6904E");
    			set_style(line, "stroke-width", "1.5px");
    			attr_dev(line, "y1", "27");
    			attr_dev(line, "y2", "30");
    			attr_dev(line, "transform", "rotate(" + 30 * /*minutes*/ ctx[4] + ")");
    			add_location(line, file, 35, 5, 1113);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(35:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minutes}",
    		ctx
    	});

    	return block;
    }

    // (86:5) {#each [1, 2, 3, 4] as offset}
    function create_each_block_1(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			set_style(line, "stroke", "#C62DFF");
    			set_style(line, "stroke-width", "1px");
    			attr_dev(line, "y1", "28");
    			attr_dev(line, "y2", "30");
    			attr_dev(line, "transform", "rotate(" + 6 * (/*minutes*/ ctx[4] + /*offset*/ ctx[7]) + ")");
    			add_location(line, file, 86, 6, 2559);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(86:5) {#each [1, 2, 3, 4] as offset}",
    		ctx
    	});

    	return block;
    }

    // (79:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minutes}
    function create_each_block(ctx) {
    	let line;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			line = svg_element("line");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			set_style(line, "stroke", "#C62DFF");
    			set_style(line, "stroke-width", "1.5px");
    			attr_dev(line, "y1", "27");
    			attr_dev(line, "y2", "30");
    			attr_dev(line, "transform", "rotate(" + 30 * /*minutes*/ ctx[4] + ")");
    			add_location(line, file, 79, 5, 2388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(79:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minutes}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let body;
    	let t0;
    	let button0;
    	let t2;
    	let h1;
    	let t3;
    	let t4_value = /*clock*/ ctx[0].Result(/*clock*/ ctx[0].Hour) + ":" + /*clock*/ ctx[0].Result(/*clock*/ ctx[0].Minute) + "";
    	let t4;
    	let t5;
    	let div0;
    	let input0;
    	let t6;
    	let input1;
    	let t7;
    	let button1;
    	let t9;
    	let div1;
    	let svg0;
    	let circle0;
    	let circle1;
    	let circle2;
    	let g0;
    	let line0;
    	let g0_transform_value;
    	let g1;
    	let line1;
    	let g1_transform_value;
    	let circle3;
    	let t10;
    	let svg1;
    	let circle4;
    	let text0;
    	let t11_value = /*clock*/ ctx[0].hexTime + "";
    	let t11;
    	let t12;
    	let svg2;
    	let circle5;
    	let circle6;
    	let circle7;
    	let image;
    	let g2;
    	let line2;
    	let text1;
    	let t13_value = /*clock*/ ctx[0].Minute + "";
    	let t13;
    	let g2_transform_value;
    	let g3;
    	let line3;
    	let text2;
    	let t14_value = /*clock*/ ctx[0].Hour + "";
    	let t14;
    	let g3_transform_value;
    	let circle8;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*clock*/ ctx[0].alarmTriggered && create_if_block(ctx);
    	let each_value_2 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < 12; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 12; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			body = element("body");
    			if (if_block) if_block.c();
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "Add Minutes!";
    			t2 = space();
    			h1 = element("h1");
    			t3 = text("Clock: ");
    			t4 = text(t4_value);
    			t5 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Reset Alarm";
    			t9 = space();
    			div1 = element("div");
    			svg0 = svg_element("svg");
    			circle0 = svg_element("circle");

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks_1[i].c();
    			}

    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			g0 = svg_element("g");
    			line0 = svg_element("line");
    			g1 = svg_element("g");
    			line1 = svg_element("line");
    			circle3 = svg_element("circle");
    			t10 = space();
    			svg1 = svg_element("svg");
    			circle4 = svg_element("circle");
    			text0 = svg_element("text");
    			t11 = text(t11_value);
    			t12 = space();
    			svg2 = svg_element("svg");
    			circle5 = svg_element("circle");

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].c();
    			}

    			circle6 = svg_element("circle");
    			circle7 = svg_element("circle");
    			image = svg_element("image");
    			g2 = svg_element("g");
    			line2 = svg_element("line");
    			text1 = svg_element("text");
    			t13 = text(t13_value);
    			g3 = svg_element("g");
    			line3 = svg_element("line");
    			text2 = svg_element("text");
    			t14 = text(t14_value);
    			circle8 = svg_element("circle");
    			attr_dev(button0, "class", "testtext buttonpos2 svelte-qr9byi");
    			attr_dev(button0, "size", "20");
    			add_location(button0, file, 18, 2, 333);
    			attr_dev(h1, "class", "text buttonpos svelte-qr9byi");
    			add_location(h1, file, 19, 2, 421);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Hour");
    			input0.required = true;
    			attr_dev(input0, "minlength", "2");
    			attr_dev(input0, "maxlength", "2");
    			attr_dev(input0, "size", "20");
    			add_location(input0, file, 22, 3, 548);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Minute");
    			input1.required = true;
    			attr_dev(input1, "minlength", "2");
    			attr_dev(input1, "maxlength", "2");
    			attr_dev(input1, "size", "20");
    			add_location(input1, file, 24, 3, 669);
    			attr_dev(button1, "class", "testtext2 svelte-qr9byi");
    			attr_dev(button1, "size", "20");
    			add_location(button1, file, 26, 3, 794);
    			attr_dev(div0, "id", "bottom");
    			attr_dev(div0, "class", "svelte-qr9byi");
    			add_location(div0, file, 21, 2, 527);
    			attr_dev(circle0, "r", "30");
    			set_style(circle0, "fill", "#000000");
    			set_style(circle0, "stroke", "#000000");
    			add_location(circle0, file, 33, 4, 981);
    			attr_dev(circle1, "r", "30");
    			set_style(circle1, "fill", "none");
    			set_style(circle1, "stroke", "#fff");
    			add_location(circle1, file, 50, 4, 1455);
    			attr_dev(circle2, "r", "30.5");
    			set_style(circle2, "fill", "none");
    			set_style(circle2, "stroke", "#000000");
    			add_location(circle2, file, 51, 4, 1510);
    			set_style(line0, "stroke", "#fff");
    			set_style(line0, "stroke-width", "1.35px");
    			attr_dev(line0, "y1", "0");
    			attr_dev(line0, "y2", "26.4");
    			add_location(line0, file, 53, 5, 1620);
    			attr_dev(g0, "transform", g0_transform_value = "rotate(" + (6 * /*clock*/ ctx[0].Minute + 180) + ")");
    			add_location(g0, file, 52, 4, 1570);
    			set_style(line1, "stroke", "#fff");
    			set_style(line1, "stroke-width", "1.35px");
    			attr_dev(line1, "y1", "0");
    			attr_dev(line1, "y2", "20");
    			add_location(line1, file, 60, 5, 1789);
    			attr_dev(g1, "transform", g1_transform_value = "rotate(" + (0.5 * /*clock*/ ctx[0].Minute + 30 * /*clock*/ ctx[0].Hour + 180) + ")");
    			add_location(g1, file, 59, 4, 1723);
    			attr_dev(circle3, "r", "0.26");
    			set_style(circle3, "fill", "#fff");
    			set_style(circle3, "stroke", "#fff");
    			add_location(circle3, file, 66, 4, 1890);
    			attr_dev(svg0, "viewBox", "-50 -50 100 100");
    			add_location(svg0, file, 32, 3, 945);
    			attr_dev(circle4, "r", "30");
    			set_style(circle4, "fill", /*clock*/ ctx[0].hexTime);
    			add_location(circle4, file, 71, 4, 2016);
    			attr_dev(text0, "x", "-23");
    			attr_dev(text0, "y", "+3");
    			set_style(text0, "font-size", "12px");
    			set_style(text0, "fill", "white");
    			set_style(text0, "stroke", "black");
    			set_style(text0, "stroke-width", "0.25px");
    			add_location(text0, file, 72, 4, 2068);
    			attr_dev(svg1, "viewBox", "-50 -50 100 100");
    			add_location(svg1, file, 70, 3, 1980);
    			attr_dev(circle5, "r", "30");
    			set_style(circle5, "fill", "#C62DFF");
    			set_style(circle5, "stroke", "#000000");
    			add_location(circle5, file, 77, 4, 2256);
    			attr_dev(circle6, "r", "30");
    			set_style(circle6, "fill", "none");
    			set_style(circle6, "stroke", "#9000C5");
    			add_location(circle6, file, 95, 4, 2736);
    			attr_dev(circle7, "r", "30.5");
    			set_style(circle7, "fill", "none");
    			set_style(circle7, "stroke", "#BA00FF");
    			add_location(circle7, file, 96, 4, 2794);
    			attr_dev(image, "src", "./public/Horns.png");
    			attr_dev(image, "height", "25");
    			attr_dev(image, "width", "25");
    			attr_dev(image, "x", "0");
    			attr_dev(image, "y", "0");
    			add_location(image, file, 97, 4, 2854);
    			set_style(line2, "stroke", "#9000C5");
    			set_style(line2, "stroke-width", "1.35px");
    			attr_dev(line2, "y1", "-22.4");
    			attr_dev(line2, "y2", "0");
    			add_location(line2, file, 99, 5, 2980);
    			attr_dev(text1, "x", "-2.3");
    			attr_dev(text1, "y", "-23.25");
    			set_style(text1, "fill", "white");
    			set_style(text1, "font-size", "7px");
    			add_location(text1, file, 104, 5, 3079);
    			attr_dev(g2, "transform", g2_transform_value = "rotate(" + 6 * /*clock*/ ctx[0].Minute + ")");
    			add_location(g2, file, 98, 4, 2934);
    			set_style(line3, "stroke", "#9000C5");
    			set_style(line3, "stroke-width", "1.35px");
    			attr_dev(line3, "y1", "0");
    			attr_dev(line3, "y2", "17");
    			add_location(line3, file, 107, 5, 3238);
    			attr_dev(text2, "x", "1.75");
    			attr_dev(text2, "y", "18");
    			attr_dev(text2, "rotate", "180");
    			set_style(text2, "fill", "white");
    			set_style(text2, "font-size", "7px");
    			add_location(text2, file, 112, 5, 3334);
    			attr_dev(g3, "transform", g3_transform_value = "rotate(" + (0.5 * /*clock*/ ctx[0].Minute + 30 * /*clock*/ ctx[0].Hour + 180) + ")");
    			add_location(g3, file, 106, 4, 3172);
    			attr_dev(circle8, "r", "0.26");
    			set_style(circle8, "fill", "none");
    			set_style(circle8, "stroke", "#9000C5");
    			add_location(circle8, file, 114, 4, 3432);
    			attr_dev(svg2, "viewBox", "-50 -50 100 100");
    			add_location(svg2, file, 76, 3, 2220);
    			attr_dev(div1, "class", "divrow svelte-qr9byi");
    			add_location(div1, file, 29, 2, 897);
    			add_location(body, file, 14, 1, 228);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			if (if_block) if_block.m(body, null);
    			append_dev(body, t0);
    			append_dev(body, button0);
    			append_dev(body, t2);
    			append_dev(body, h1);
    			append_dev(h1, t3);
    			append_dev(h1, t4);
    			append_dev(body, t5);
    			append_dev(body, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*clock*/ ctx[0].AlarmHour);
    			append_dev(div0, t6);
    			append_dev(div0, input1);
    			set_input_value(input1, /*clock*/ ctx[0].AlarmMinute);
    			append_dev(div0, t7);
    			append_dev(div0, button1);
    			append_dev(body, t9);
    			append_dev(body, div1);
    			append_dev(div1, svg0);
    			append_dev(svg0, circle0);

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks_1[i].m(svg0, null);
    			}

    			append_dev(svg0, circle1);
    			append_dev(svg0, circle2);
    			append_dev(svg0, g0);
    			append_dev(g0, line0);
    			append_dev(svg0, g1);
    			append_dev(g1, line1);
    			append_dev(svg0, circle3);
    			append_dev(div1, t10);
    			append_dev(div1, svg1);
    			append_dev(svg1, circle4);
    			append_dev(svg1, text0);
    			append_dev(text0, t11);
    			append_dev(div1, t12);
    			append_dev(div1, svg2);
    			append_dev(svg2, circle5);

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].m(svg2, null);
    			}

    			append_dev(svg2, circle6);
    			append_dev(svg2, circle7);
    			append_dev(svg2, image);
    			append_dev(svg2, g2);
    			append_dev(g2, line2);
    			append_dev(g2, text1);
    			append_dev(text1, t13);
    			append_dev(svg2, g3);
    			append_dev(g3, line3);
    			append_dev(g3, text2);
    			append_dev(text2, t14);
    			append_dev(svg2, circle8);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*tick*/ ctx[1], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[2]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[3]),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*clock*/ ctx[0].resetAlarm())) /*clock*/ ctx[0].resetAlarm().apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*clock*/ ctx[0].alarmTriggered) {
    				if (if_block) {
    					if (dirty & /*clock*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(body, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*clock*/ 1) && t4_value !== (t4_value = /*clock*/ ctx[0].Result(/*clock*/ ctx[0].Hour) + ":" + /*clock*/ ctx[0].Result(/*clock*/ ctx[0].Minute) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*clock*/ 1 && input0.value !== /*clock*/ ctx[0].AlarmHour) {
    				set_input_value(input0, /*clock*/ ctx[0].AlarmHour);
    			}

    			if (dirty & /*clock*/ 1 && input1.value !== /*clock*/ ctx[0].AlarmMinute) {
    				set_input_value(input1, /*clock*/ ctx[0].AlarmMinute);
    			}

    			if (!current || dirty & /*clock*/ 1 && g0_transform_value !== (g0_transform_value = "rotate(" + (6 * /*clock*/ ctx[0].Minute + 180) + ")")) {
    				attr_dev(g0, "transform", g0_transform_value);
    			}

    			if (!current || dirty & /*clock*/ 1 && g1_transform_value !== (g1_transform_value = "rotate(" + (0.5 * /*clock*/ ctx[0].Minute + 30 * /*clock*/ ctx[0].Hour + 180) + ")")) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}

    			if (!current || dirty & /*clock*/ 1) {
    				set_style(circle4, "fill", /*clock*/ ctx[0].hexTime);
    			}

    			if ((!current || dirty & /*clock*/ 1) && t11_value !== (t11_value = /*clock*/ ctx[0].hexTime + "")) set_data_dev(t11, t11_value);
    			if ((!current || dirty & /*clock*/ 1) && t13_value !== (t13_value = /*clock*/ ctx[0].Minute + "")) set_data_dev(t13, t13_value);

    			if (!current || dirty & /*clock*/ 1 && g2_transform_value !== (g2_transform_value = "rotate(" + 6 * /*clock*/ ctx[0].Minute + ")")) {
    				attr_dev(g2, "transform", g2_transform_value);
    			}

    			if ((!current || dirty & /*clock*/ 1) && t14_value !== (t14_value = /*clock*/ ctx[0].Hour + "")) set_data_dev(t14, t14_value);

    			if (!current || dirty & /*clock*/ 1 && g3_transform_value !== (g3_transform_value = "rotate(" + (0.5 * /*clock*/ ctx[0].Minute + 30 * /*clock*/ ctx[0].Hour + 180) + ")")) {
    				attr_dev(g3, "transform", g3_transform_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let clock = new Clock(0, 0);
    	clock.setAlarm();

    	function tick() {
    		clock.tick();
    		$$invalidate(0, clock);
    	}

    	setInterval(tick, 1000);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		clock.AlarmHour = this.value;
    		$$invalidate(0, clock);
    	}

    	function input1_input_handler() {
    		clock.AlarmMinute = this.value;
    		$$invalidate(0, clock);
    	}

    	$$self.$capture_state = () => ({ fade, Clock, clock, tick });

    	$$self.$inject_state = $$props => {
    		if ('clock' in $$props) $$invalidate(0, clock = $$props.clock);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clock, tick, input0_input_handler, input1_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Test'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
