import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage, Group,
  Line, LineBasicMaterial, Points, ShaderMaterial,
} from 'three';

/** Six luminous filaments and a small, reusable field of concert dust. */
export class GuitarAtmosphere {
  readonly group = new Group();
  private readonly filaments: Line<BufferGeometry, LineBasicMaterial>[] = [];
  private readonly particles: Points<BufferGeometry, ShaderMaterial>;

  constructor() {
    for (let i = 0; i < 6; i++) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(128 * 3), 3).setUsage(DynamicDrawUsage));
      const material = new LineBasicMaterial({
        color: i % 2 ? 0xbda0ff : 0xf3a0df, transparent: true, opacity: 0,
        blending: AdditiveBlending, depthWrite: false,
      });
      const line = new Line(geometry, material);
      line.frustumCulled = false;
      this.filaments.push(line);
      this.group.add(line);
    }
    const positions = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      // Deterministic distribution keeps resizing and navigation visually consistent.
      positions[i * 3] = Math.sin(i * 127.1) * 3;
      positions[i * 3 + 1] = Math.sin(i * 311.7) * 3.5;
      positions[i * 3 + 2] = -1.2 - (i % 7) * .2;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { time: { value: 0 }, energy: { value: 0 }, treble: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) } },
      vertexShader: `
        uniform float time, energy, treble, pixelRatio;
        varying float sparkle;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + 3.5 + time * .09, 7.) - 3.5;
          p.x += sin(time * .5 + position.y * 2.) * (.07 + energy * .2);
          sparkle = pow(.5 + .5 * sin(time * 2. + position.x * 23. + position.y * 17.), 5.);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
          gl_PointSize = (1.5 + sparkle * (2. + treble * 6.)) * pixelRatio;
        }`,
      fragmentShader: `
        uniform float energy, treble;
        varying float sparkle;
        void main() {
          float glow = 1. - smoothstep(.05, .5, length(gl_PointCoord - .5));
          gl_FragColor = vec4(mix(vec3(.64,.46,1.), vec3(1.,.8,.93), sparkle),
            glow * (.035 + energy * .3 + sparkle * treble * .6));
        }`,
    });
    this.particles = new Points(geometry, material);
    this.particles.frustumCulled = false;
    this.group.add(this.particles);
  }

  update(time: number, bass: number, mid: number, treble: number, pulse: number): void {
    for (let strand = 0; strand < this.filaments.length; strand++) {
      const line = this.filaments[strand];
      const positions = line.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const angle = i / (positions.count - 1) * Math.PI * 2;
        const wave = Math.sin(angle * 5 - time * (1.2 + strand * .08) + strand * .7) * mid * .19;
        const radius = 1.45 + strand * .075 + bass * .22 + pulse * .12 + wave;
        const x = Math.cos(angle) * radius;
        positions.setXYZ(i, x, -.85 + Math.sin(angle) * (.5 + mid * .3) + x * .38 + strand * .065,
          -1.15 + Math.sin(angle) * .3);
      }
      positions.needsUpdate = true;
      line.material.opacity = .018 + mid * .48 + bass * .16 + pulse * .12;
    }
    this.group.rotation.y = Math.sin(time * .23) * .15;
    this.particles.material.uniforms['time'].value = time;
    this.particles.material.uniforms['energy'].value = (bass + mid) * .5;
    this.particles.material.uniforms['treble'].value = treble;
  }

  dispose(): void {
    for (const line of this.filaments) { line.geometry.dispose(); line.material.dispose(); }
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
