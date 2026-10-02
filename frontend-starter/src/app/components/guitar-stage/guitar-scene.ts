import {
  ACESFilmicToneMapping, Box3, DirectionalLight, Group, Mesh,
  MeshStandardMaterial, OrthographicCamera, PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AudioSpectrum } from '../../shared/models/audio-spectrum';
import { GuitarAtmosphere } from './guitar-atmosphere';

/** Owns the decorative canvas and all its GPU resources, independently of Angular. */
export class GuitarScene {
  private readonly renderer: WebGLRenderer;
  private readonly world = new Scene();
  private readonly camera = new OrthographicCamera(-3, 3, 3.6, -3.6, .1, 40);
  private readonly pivot = new Group();
  private readonly rim = new DirectionalLight(0x70bded, 4);
  private readonly accent = new DirectionalLight(0x70bded, 0);
  private readonly rimTone = this.rim.color.getHSL({ h: 0, s: 0, l: 0 });
  private readonly atmosphere = new GuitarAtmosphere();
  private readonly environment;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private model?: Group;
  private frame = 0;
  private lastFrame = 0;
  private time = 0;
  private bass = 0;
  private mid = 0;
  private treble = 0;
  private pulse = 0;
  private bassFloor = 0;
  private compact = false;
  private pointerX = 0;
  private pointerY = 0;
  private visible = true;
  private loaded = false;
  private disposed = false;

  constructor(private readonly host: HTMLElement, private readonly sample: () => AudioSpectrum, onContextLost: () => void) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .5s';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.dispose();
      onContextLost();
    }, { once: true });
    this.host.appendChild(canvas);

    const room = new RoomEnvironment();
    const pmrem = new PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, .04);
    this.world.environment = this.environment.texture;
    this.world.environmentIntensity = .7;
    room.dispose();
    pmrem.dispose();
    this.rim.position.set(-3, 1, -2);
    const key = new DirectionalLight(0xfff6e6, 2);
    key.position.set(2, 4, 5);
    const fill = new DirectionalLight(0x70bded, .8);
    fill.position.set(-4, -1, 3);
    this.accent.position.set(3, -2, 3);
    this.world.add(this.pivot, this.rim, this.accent, this.atmosphere.group, key, fill);
    this.camera.position.set(0, .1, 12);
    this.camera.lookAt(0, 0, 0);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.visible = entries[0]?.isIntersecting ?? false;
      this.schedule();
    });
    this.intersectionObserver.observe(host);
    host.addEventListener('pointermove', this.onPointer);
    host.addEventListener('pointerleave', this.onPointerLeave);
    document.addEventListener('visibilitychange', this.schedule);
    this.resize();
  }

  async load(): Promise<boolean> {
    const { scene } = await new GLTFLoader().loadAsync('/models/obsidian-guitar.glb');
    if (this.disposed) { this.disposeModel(scene); return false; }
    const bounds = new Box3().setFromObject(scene);
    scene.position.sub(bounds.getCenter(new Vector3()));
    scene.traverse(object => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
        object.material.envMapIntensity = object.material.name.includes('lacquer') ? .9 : 1.4;
      }
    });
    this.model = scene;
    this.pivot.add(scene);
    this.pivot.rotation.set(.03, -.24, -.17);
    await this.renderer.compileAsync(this.world, this.camera);
    if (this.disposed) return false;
    this.loaded = true;
    this.renderer.render(this.world, this.camera);
    this.renderer.domElement.style.opacity = '1';
    this.schedule();
    return true;
  }

  private readonly resize = (): void => {
    if (this.disposed) return;
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.compact = height < 400;
    const halfHeight = this.compact ? 2.05 : Math.max(3.65, 2 / (width / height));
    this.pivot.position.x = this.compact ? 1.15 : 0;
    this.atmosphere.group.position.x = this.compact ? 1.15 : 0;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfHeight * width / height;
    this.camera.right = halfHeight * width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.loaded) this.renderer.render(this.world, this.camera);
  };

  private readonly onPointer = (event: PointerEvent): void => {
    const rect = this.host.getBoundingClientRect();
    this.pointerX = (event.clientX - rect.left) / rect.width - .5;
    this.pointerY = (event.clientY - rect.top) / rect.height - .5;
  };

  private readonly onPointerLeave = (): void => { this.pointerX = this.pointerY = 0; };

  private readonly schedule = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastFrame = 0;
    if (this.loaded && !this.disposed && this.visible && !document.hidden) {
      this.frame = requestAnimationFrame(this.animate);
    }
  };

  private readonly animate = (now: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (this.lastFrame && now - this.lastFrame < 1000 / 30) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, .1) : 0;
    this.lastFrame = now;
    this.time += dt;
    const spectrum = this.sample();
    const easing = 1 - Math.exp(-dt * 5);
    const attack = 1 - Math.exp(-dt * 12);
    // A gentle response curve keeps quiet recordings expressive as well.
    this.bass += (Math.sqrt(spectrum.bass) - this.bass) * attack;
    this.mid += (Math.sqrt(spectrum.mid) - this.mid) * easing;
    this.treble += (Math.sqrt(spectrum.treble) - this.treble) * attack;
    this.bassFloor += (this.bass - this.bassFloor) * (1 - Math.exp(-dt * 2));
    this.pulse = Math.max(this.pulse * Math.exp(-dt * 5), Math.min(1, Math.max(0, this.bass - this.bassFloor) * 3));
    const energy = this.bass * .45 + this.mid * .55;
    this.pivot.rotation.y += (-.24 + this.pointerX * .26 + Math.sin(this.time * .65) * (.055 + energy * .22) - this.pivot.rotation.y) * easing;
    this.pivot.rotation.x += (.03 + this.pointerY * .1 + Math.sin(this.time * 1.3) * this.mid * .065 - this.pivot.rotation.x) * easing;
    this.pivot.rotation.z = (this.compact ? -.44 : -.17) + Math.sin(this.time * .85) * (.012 + energy * .075) - this.pulse * .035;
    this.pivot.position.y = Math.sin(this.time * .8) * (.055 + energy * .09) + this.pulse * .055;
    this.pivot.scale.setScalar(1 + this.bass * .018 + this.pulse * .014);
    this.rim.intensity = 4 + this.bass * 5 + this.pulse * 3;
    this.rim.color.setHSL(this.rimTone.h + this.mid * .055, this.rimTone.s, this.rimTone.l);
    this.accent.intensity = this.mid * 3 + this.treble * 2;
    this.atmosphere.update(this.time, this.bass, this.mid, this.treble, this.pulse);
    this.host.style.setProperty('--music-energy', energy.toFixed(3));
    this.renderer.render(this.world, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.host.removeEventListener('pointermove', this.onPointer);
    this.host.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.schedule);
    if (this.model) this.disposeModel(this.model);
    this.atmosphere.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private disposeModel(model: Group): void {
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }
}
