
// Variables globales
let db;
let storage;

// DOM elements
const imageGallery = document.getElementById('image-gallery');
const uploadButton = document.getElementById('upload-button');
const uploadModal = document.getElementById('upload-modal');
const closeUploadButton = document.querySelector('#upload-modal .close');
const uploadForm = document.getElementById('upload-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const imageDetailModal = document.getElementById('image-detail-modal');
const closeDetailButton = document.querySelector('#image-detail-modal .close');

// Inicializar Firebase y cargar imágenes
function initializeFirebaseAndLoadImages() {
    console.log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();

    console.log('Firebase initialized, testing connection...');
    testFirebaseConnection()
        .then(() => {
            console.log('Firebase connection successful, fetching images...');
            return fetchImages();
        })
        .catch(error => {
            console.error('Error during initialization:', error);
            imageGallery.innerHTML = '<p>Error initializing the application. Please try again later.</p>';
        });
}

async function testFirebaseConnection() {
    try {
        const testDoc = await db.collection('test').doc('test').get();
        console.log('Firebase connection test successful');
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        throw error;
    }
}

// Fetch and render images
async function fetchImages(query = '') {
    try {
        console.log('Fetching images...');
        imageGallery.innerHTML = '';

        let imagesRef = db.collection('images').orderBy('timestamp', 'desc');

        if (query) {
            imagesRef = imagesRef.where('tags', 'array-contains', query)
                .or('title', '==', query)
                .or('author', '==', query);
        }

        const snapshot = await imagesRef.get();

        console.log(`Found ${snapshot.size} images`);

        if (snapshot.empty) {
            imageGallery.innerHTML = '<p>No images found.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('Image data:', data);
            const imageCard = createImageCard(data);
            imageGallery.appendChild(imageCard);
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        imageGallery.innerHTML = '<p>Error loading images. Please try again later.</p>';
    }
}

// Create image card element
function createImageCard(data) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = data.id;

    card.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.title}" onerror="this.src='placeholder.jpg';">
        <div class="image-info">
            <h3 class="image-title">${data.title}</h3>
            <p class="image-prompt">${data.prompt}</p>
            <div class="image-tags">
                ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;

    card.addEventListener('click', () => showImageDetail(data));

    return card;
}

function showImageDetail(data) {
    const detailContent = document.getElementById('image-detail-content');
    detailContent.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.title}">
        <div class="image-info">
            <h3 class="image-title">${data.title}</h3>
            <p class="image-prompt">${data.prompt}</p>
            <div class="image-tags">
                ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="image-author">By: ${data.author}</p>
        </div>
    `;
    imageDetailModal.style.display = 'block';
}

// Función para cerrar modales
function closeModal(modal) {
    modal.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebaseAndLoadImages();

    uploadButton.addEventListener('click', () => {
        uploadModal.style.display = 'block';
    });

    closeUploadButton.addEventListener('click', () => closeModal(uploadModal));

    closeDetailButton.addEventListener('click', (event) => {
        event.stopPropagation();
        closeModal(imageDetailModal);
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = document.getElementById('image-file').files[0];
        const title = document.getElementById('image-title').value;
        const prompt = document.getElementById('image-prompt').value;
        const tags = document.getElementById('image-tags').value.split(',').map(tag => tag.trim());
        const author = document.getElementById('image-author').value;

        try {
            // Upload image to Firebase Storage
            const storageRef = storage.ref(`images/${file.name}`);
            await storageRef.put(file);
            const imageUrl = await storageRef.getDownloadURL();

            // Save image data to Firestore
            await db.collection('images').add({
                title,
                prompt,
                tags,
                author,
                imageUrl,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Close modal and reset form
            closeModal(uploadModal);
            uploadForm.reset();
            console.log('Image uploaded successfully, refreshing gallery...');
            await fetchImages();
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    });

    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim().toLowerCase();
        fetchImages(query);
    });

    // Cerrar modales si se hace clic fuera del contenido
    window.addEventListener('click', (event) => {
        if (event.target === uploadModal) {
            closeModal(uploadModal);
        }
        if (event.target === imageDetailModal) {
            closeModal(imageDetailModal);
        }
    });
});