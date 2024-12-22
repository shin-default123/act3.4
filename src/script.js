import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';
import * as CANNON from 'cannon';

/**
 * Debug
 */
const gui = new dat.GUI();
const debugObject = {};

debugObject.createSphere = () => {
    createSphere(Math.random() * 0.5, {
        x: (Math.random() - 0.5) * 3,
        y: 3,
        z: (Math.random() - 0.5) * 3
    });
};

gui.add(debugObject, 'createSphere');

debugObject.createBox = () => {
    createBox(Math.random(), Math.random(), Math.random(), {
        x: (Math.random() - 0.5) * 3,
        y: 3,
        z: (Math.random() - 0.5) * 3
    });
};
gui.add(debugObject, 'createBox');

// Reset
debugObject.reset = () => {
    for (const object of objectsToUpdate) {
        // Remove body
        object.body.removeEventListener('collide', playHitSound);
        world.removeBody(object.body);

        // Remove mesh
        scene.remove(object.mesh);
    }

    objectsToUpdate.splice(0, objectsToUpdate.length);
};
gui.add(debugObject, 'reset');

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3');

const playHitSound = (collision) => {
    const impactStrength = collision.contact.getImpactVelocityAlongNormal();

    if (impactStrength > 1.5) {
        hitSound.volume = Math.random();
        hitSound.currentTime = 0;
        hitSound.play();
    }
};

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
]);

/**
 * Physics
 */
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

// Define Materials
const concreteMaterial = new CANNON.Material('concrete');
const plasticMaterial = new CANNON.Material('plastic');

// Define Contact Material (how concrete and plastic interact)
const concretePlasticContactMaterial = new CANNON.ContactMaterial(
    concreteMaterial,
    plasticMaterial,
    {
        friction: 0.1,   // Low friction
        restitution: 0.7 // Moderate bounce
    }
);

// Add the contact material to the world
world.addContactMaterial(concretePlasticContactMaterial);

// Default material for other objects
const defaultMaterial = new CANNON.Material('default');

// Define contact material for default material
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,   // Low friction
        restitution: 0.7 // Moderate bounce
    }
);

// Add the default contact material to the world
world.addContactMaterial(defaultContactMaterial);

// Set the world's default contact material
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0; // Static body (no mass)
floorBody.addShape(floorShape);

// Apply rotation to the floor body
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5); // Rotate 90 degrees along the X axis

// Assign default material to the floor body
floorBody.material = defaultMaterial;

world.addBody(floorBody);

/**
 * Utils
 */
const objectsToUpdate = []; // Array to store mesh and body objects

// Create sphere
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5
});

const createSphere = (radius, position) => {
    // Three.js mesh
    const mesh = new THREE.Mesh(
        sphereGeometry,
        sphereMaterial
    );
    mesh.castShadow = true; // Enable shadow casting for the mesh
    mesh.scale.set(radius, radius, radius);
    mesh.position.copy(position); // Set the position of the mesh in the scene
    scene.add(mesh);

    // Cannon.js body
    const shape = new CANNON.Sphere(radius); // Create a sphere shape
    const body = new CANNON.Body({
        mass: 1, // Mass of 1 for the sphere
        position: new CANNON.Vec3(position.x, position.y, position.z), // Set position from the input parameter
        material: defaultMaterial // Use the default material for collision
    });

    // Add the shape to the body
    body.addShape(shape);

    // Add collision sound effect
    body.addEventListener('collide', playHitSound);

    // Add the body to the world
    world.addBody(body);

    // Save the mesh and body to objectsToUpdate array
    objectsToUpdate.push({ mesh, body });
};

// Create box
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5
});

const createBox = (width, height, depth, position) => {
    // Three.js mesh
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    // Cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5));

    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(position.x, position.y, position.z),
        material: defaultMaterial // Assign default material to box
    });
    body.addShape(shape);

    // Add collision sound effect
    body.addEventListener('collide', playHitSound);

    // Add the body to the world
    world.addBody(body);

    // Save the mesh and body to objectsToUpdate array
    objectsToUpdate.push({ mesh, body });
    
};

createBox(1, 1.5, 2, { x: 0, y: 3, z: 0 });

/**
 * Floor Mesh
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
);
floor.receiveShadow = true;
floor.rotation.x = - Math.PI * 0.5; // Align with Cannon.js body rotation
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = - 7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = - 7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(3, 3, 3);
scene.add(camera);

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI * 0.5;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    // Update physics world
    world.step(1 / 60, deltaTime, 3);

    // Update meshes with corresponding bodies
    for (const object of objectsToUpdate) {
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion);
    }

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);

    // Call next frame
    window.requestAnimationFrame(tick);
};

// Start animation loop
tick();
