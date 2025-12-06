<template>
  <section class="milestone-map-page">
    <h1>Milestone Map</h1>
    
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading your milestone maps...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button @click="loadMaps" class="retry-button">Retry</button>
    </div>

    <div v-else-if="maps.length === 0" class="empty-state">
      <p>No milestone maps yet.</p>
      <button @click="showCreateMapModal = true" class="create-button">Create Milestone Map</button>
    </div>

    <div v-else class="map-container">
      <div class="map-header">
        <div class="map-selector">
          <label for="mapSelect">Select Map:</label>
          <select id="mapSelect" v-model="selectedMapId" class="map-select">
            <option v-for="map in maps" :key="map.id" :value="map.id">
              {{ getPartnerName(map) }}
            </option>
          </select>
          <span v-if="selectedMapId" class="map-created-tag">
            Created {{ formatDate(maps.find(m => m.id === selectedMapId)?.createdAt || '') }}
          </span>
        </div>
        <button @click="showCreateMapModal = true" class="create-button">+ New Map</button>
      </div>

      <div class="map-wrapper">
        <div v-if="mapLoading" class="map-loading">
          <div class="spinner"></div>
          <p>Loading map...</p>
        </div>
        <div id="leaflet-map" class="leaflet-map" :class="{ hidden: mapLoading }"></div>
      </div>

      <button @click="showAddMilestoneModal = true" class="add-milestone-button">
        + Add Milestone
      </button>

      <div class="milestones-list">
        <h3>Milestones ({{ milestones.length }})</h3>
        <div v-if="milestones.length === 0" class="no-milestones">
          <p>No milestones yet. Click on the map or use the button above to add your first milestone!</p>
        </div>
        <div v-else class="milestone-items">
          <div v-for="milestone in milestones" :key="milestone.id" class="milestone-item">
            <div class="milestone-content">
              <h4>{{ milestone.title }}</h4>
              <p>{{ milestone.description }}</p>
              <span class="milestone-meta">Added by {{ getMilestoneAuthor(milestone.addedBy) }} • {{ formatDateTime(milestone.createdAt) }}</span>
            </div>
            <button @click="promptRemoveMilestone(milestone.id)" class="remove-button">Remove</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Milestone Modal -->
    <div v-if="showAddMilestoneModal" class="modal-overlay" @click="closeAddMilestoneModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add Milestone</h2>
          <button @click="closeAddMilestoneModal" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Title</label>
            <input v-model="newMilestone.title" type="text" placeholder="e.g., First 5K Together" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="newMilestone.description" rows="3" placeholder="Describe this milestone..."></textarea>
          </div>
          <div class="form-group">
            <label>Location</label>
            <p class="location-hint">Click on the map to set the location, or enter coordinates:</p>
            <div class="coordinates">
              <input v-model.number="newMilestone.latitude" type="number" step="0.000001" placeholder="Latitude" />
              <input v-model.number="newMilestone.longitude" type="number" step="0.000001" placeholder="Longitude" />
            </div>
          </div>
          <div v-if="milestoneError" class="error-message">{{ milestoneError }}</div>
          <button @click="addMilestone" :disabled="!canAddMilestone || addingMilestone" class="primary-button">
            <span v-if="addingMilestone" class="button-spinner"></span>
            <span v-else>Add Milestone</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Map Modal -->
    <div v-if="showCreateMapModal" class="modal-overlay" @click="closeCreateMapModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Create Milestone Map</h2>
          <button @click="closeCreateMapModal" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Running Partner</label>
            <select v-model="selectedPartner">
              <option :value="null" disabled>Choose a partner...</option>
              <option v-for="partner in partners" :key="partner.id" :value="partner.id">
                {{ partner.displayname }}
              </option>
            </select>
          </div>
          <div v-if="createMapError" class="error-message">{{ createMapError }}</div>
          <button @click="createNewMap" :disabled="!selectedPartner || creatingMap" class="primary-button">
            <span v-if="creatingMap" class="button-spinner"></span>
            <span v-else>Create Map</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Remove Milestone Modal -->
    <ConfirmActionModal
      v-if="showConfirmModal"
      title="Remove Milestone"
      message="Are you sure you want to remove this milestone? This action cannot be undone."
      confirm-text="Remove"
      confirm-class="danger"
      @close="cancelRemoveMilestone"
      @confirm="confirmRemoveMilestone"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { ApiService } from '../services/api';
import ConfirmActionModal from '../components/ConfirmActionModal.vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MilestoneMap {
  id: string;
  partnerA: string;
  partnerB: string;
  createdAt: string;
  isActive: boolean;
}

interface Milestone {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  addedBy: string;
  photoFileId?: string;
  createdAt: string;
}

const auth = useAuthStore();
const maps = ref<MilestoneMap[]>([]);
const selectedMapId = ref<string | null>(null);
const milestones = ref<Milestone[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showAddMilestoneModal = ref(false);
const addingMilestone = ref(false);
const milestoneError = ref<string | null>(null);

// Create map modal state
const showCreateMapModal = ref(false);
const partners = ref<any[]>([]);
const selectedPartner = ref<string | null>(null);
const creatingMap = ref(false);
const createMapError = ref<string | null>(null);

// Map loading state
const mapLoading = ref(false);

// Confirm modal state
const showConfirmModal = ref(false);
const milestoneToRemove = ref<string | null>(null);

// Milestone author names cache
const milestoneAuthors = ref<{ [key: string]: string }>({});

// Partner names cache for map selector
const mapPartnerNames = ref<{ [key: string]: string }>({});

let map: L.Map | null = null;
const markers = ref<L.Marker[]>([]);

const newMilestone = ref({
  title: '',
  description: '',
  latitude: 0,
  longitude: 0,
});

const canAddMilestone = computed(() => {
  return newMilestone.value.title.trim() && 
         newMilestone.value.description.trim() &&
         newMilestone.value.latitude !== 0 &&
         newMilestone.value.longitude !== 0;
});

function getPartnerName(mapData: MilestoneMap): string {
  const currentUserId = auth.user?.id;
  const partnerId = mapData.partnerA === currentUserId ? mapData.partnerB : mapData.partnerA;
  return mapPartnerNames.value[partnerId] || `Partner ${partnerId.substring(0, 8)}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getMilestoneAuthor(addedBy: string): string {
  if (addedBy === auth.user?.id) {
    return 'You';
  }
  return milestoneAuthors.value[addedBy] || 'Loading...';
}

async function loadMaps() {
  if (!auth.user?.id) return;
  
  loading.value = true;
  error.value = null;

  try {
    const result = await ApiService.callConceptAction<{ maps: MilestoneMap[] }>(
      'MilestoneMap',
      '_getAllMapsForUser',
      { user: auth.user.id }
    );

    maps.value = (result.maps || result) as MilestoneMap[];
    
    // Fetch partner names for map selector
    const uniquePartners = [...new Set(
      maps.value.map(map => 
        map.partnerA === auth.user!.id ? map.partnerB : map.partnerA
      )
    )];
    
    for (const partnerId of uniquePartners) {
      if (!mapPartnerNames.value[partnerId]) {
        try {
          const [displaynameResult, usernameResult] = await Promise.allSettled([
            ApiService.callConceptAction('UserProfile', '_getDisplayName', { user: partnerId }),
            ApiService.callConceptAction('PasswordAuthentication', '_getUsername', { user: partnerId })
          ]);
          
          let displayname = partnerId;
          let username = '';
          
          if (displaynameResult.status === 'fulfilled' && displaynameResult.value && !('error' in displaynameResult.value)) {
            displayname = displaynameResult.value.displayname;
          }
          
          if (usernameResult.status === 'fulfilled' && usernameResult.value && !('error' in usernameResult.value)) {
            username = usernameResult.value.username;
          }
          
          mapPartnerNames.value[partnerId] = username ? `${displayname} (${username})` : displayname;
        } catch (e) {
          console.warn('Could not fetch partner info for:', partnerId);
        }
      }
    }
    
    if (maps.value.length > 0 && !selectedMapId.value && maps.value[0]) {
      selectedMapId.value = maps.value[0].id;
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load milestone maps';
    console.error('Failed to load maps:', e);
  } finally {
    loading.value = false;
  }
}

async function loadMilestones() {
  if (!selectedMapId.value) return;

  try {
    const result = await ApiService.callConceptAction<Milestone[]>(
      'MilestoneMap',
      '_getMilestones',
      { milestoneMap: selectedMapId.value }
    );

    milestones.value = Array.isArray(result) ? result : [];
    
    // Fetch author names for milestones
    const uniqueAuthors = [...new Set(milestones.value.map(m => m.addedBy).filter(id => id !== auth.user?.id))];
    for (const authorId of uniqueAuthors) {
      if (!milestoneAuthors.value[authorId]) {
        try {
          const [displaynameResult, usernameResult] = await Promise.allSettled([
            ApiService.callConceptAction('UserProfile', '_getDisplayName', { user: authorId }),
            ApiService.callConceptAction('PasswordAuthentication', '_getUsername', { user: authorId })
          ]);
          
          let displayname = authorId;
          let username = '';
          
          if (displaynameResult.status === 'fulfilled' && displaynameResult.value && !('error' in displaynameResult.value)) {
            displayname = displaynameResult.value.displayname;
          }
          
          if (usernameResult.status === 'fulfilled' && usernameResult.value && !('error' in usernameResult.value)) {
            username = usernameResult.value.username;
          }
          
          milestoneAuthors.value[authorId] = username ? `${displayname} (${username})` : displayname;
        } catch (e) {
          console.warn('Could not fetch author info for:', authorId);
          milestoneAuthors.value[authorId] = 'Unknown';
        }
      }
    }
    
    updateMapMarkers();
  } catch (e: any) {
    console.error('Failed to load milestones:', e);
  }
}

async function initMap() {
  try {
    if (map) {
      map.remove();
    }

    // Default to Boston
    const defaultLat = 42.3601;
    const defaultLng = -71.0589;
    
    mapLoading.value = true;
    
    // Small delay to ensure DOM is ready
    await nextTick();
    
    map = L.map('leaflet-map').setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

    // Add click handler to add milestones
    map.on('click', (e: L.LeafletMouseEvent) => {
      newMilestone.value.latitude = e.latlng.lat;
      newMilestone.value.longitude = e.latlng.lng;
      showAddMilestoneModal.value = true;
    });
  } finally {
    mapLoading.value = false;
  }
}

function updateMapMarkers() {
  if (!map) return;

  // Clear existing markers
  markers.value.forEach(marker => marker.remove());
  markers.value = [];

  // Add new markers
  milestones.value.forEach(milestone => {
    const marker = L.marker([milestone.latitude, milestone.longitude])
      .bindPopup(`<strong>${milestone.title}</strong><br>${milestone.description}`)
      .addTo(map!);
    markers.value.push(marker);
  });

  // Fit bounds if there are milestones, but don't change zoom/position if only one milestone
  if (milestones.value.length > 1) {
    const bounds = L.latLngBounds(milestones.value.map(m => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [50, 50] });
  } else if (milestones.value.length === 1 && milestones.value[0]) {
    // Just center on the single milestone without changing zoom
    map.panTo([milestones.value[0].latitude, milestones.value[0].longitude]);
  }
}

async function addMilestone() {
  if (!canAddMilestone.value || !selectedMapId.value) return;

  addingMilestone.value = true;
  milestoneError.value = null;

  try {
    await ApiService.callConceptAction(
      'MilestoneMap',
      'addMilestone',
      {
        milestoneMapId: selectedMapId.value,
        latitude: newMilestone.value.latitude,
        longitude: newMilestone.value.longitude,
        title: newMilestone.value.title,
        description: newMilestone.value.description,
      }
    );

    closeAddMilestoneModal();
    await loadMilestones();
  } catch (e: any) {
    milestoneError.value = e.message || 'Failed to add milestone';
    console.error('Failed to add milestone:', e);
  } finally {
    addingMilestone.value = false;
  }
}

function promptRemoveMilestone(milestoneId: string) {
  milestoneToRemove.value = milestoneId;
  showConfirmModal.value = true;
}

async function confirmRemoveMilestone() {
  if (!milestoneToRemove.value) return;

  try {
    await ApiService.callConceptAction(
      'MilestoneMap',
      'removeMilestone',
      {
        milestoneId: milestoneToRemove.value,
      }
    );

    await loadMilestones();
  } catch (e: any) {
    console.error('Failed to remove milestone:', e);
    alert('Failed to remove milestone: ' + (e.message || 'Unknown error'));
  } finally {
    showConfirmModal.value = false;
    milestoneToRemove.value = null;
  }
}

function cancelRemoveMilestone() {
  showConfirmModal.value = false;
  milestoneToRemove.value = null;
}

function closeAddMilestoneModal() {
  showAddMilestoneModal.value = false;
  newMilestone.value = {
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
  };
  milestoneError.value = null;
}

async function loadPartners() {
  if (!auth.user?.id) return;

  const userMap: { [key: string]: { id: string; displayname: string } } = {};
  
  try {
    // 1. Fetch long-term partners from PartnerMatching
      const partnersResult = await ApiService.callConceptAction(
        'PartnerMatching',
        '_getPartners',
        { user: auth.user.id }
      );
      
      if (partnersResult && partnersResult.partners && Array.isArray(partnersResult.partners)) {
        for (const partnerId of partnersResult.partners) {
          if (partnerId !== auth.user.id && !userMap[partnerId]) {
            userMap[partnerId] = { id: partnerId, displayname: partnerId };
          }
        }
      }
    
    // 2. Fetch users from OneRunMatching runs
      const runsResult = await ApiService.callConceptAction(
        'OneRunMatching',
        '_getMatches',
        { user: auth.user.id }
      );
      
      if (runsResult && Array.isArray(runsResult)) {
        for (const run of runsResult) {
          const otherUserId = run.userA === auth.user.id ? run.userB : run.userA;
          if (otherUserId && otherUserId !== auth.user.id && !userMap[otherUserId]) {
            userMap[otherUserId] = { id: otherUserId, displayname: otherUserId };
          }
        }
      }
    
    // 3. Fetch displaynames and usernames for all users
    const userIds = Object.keys(userMap);
    
    for (const userId of userIds) {
      try {
        // Fetch both displayname and username in parallel
        const [displaynameResult, usernameResult] = await Promise.allSettled([
          ApiService.callConceptAction('UserProfile', '_getDisplayName', { user: userId }),
          ApiService.callConceptAction('PasswordAuthentication', '_getUsername', { user: userId })
        ]);
        
        let displayname = userId;
        let username = '';
        
        if (displaynameResult.status === 'fulfilled' && displaynameResult.value && !('error' in displaynameResult.value)) {
          displayname = displaynameResult.value.displayname;
        }
        
        if (usernameResult.status === 'fulfilled' && usernameResult.value && !('error' in usernameResult.value)) {
          username = usernameResult.value.username;
        }

        if (userMap[userId]) {
          userMap[userId].displayname = username ? `${displayname} (${username})` : displayname;
        }
      } catch (e) {
        console.warn('Could not fetch user info for:', userId);
      }
    }
    
    partners.value = Object.values(userMap).sort((a, b) => 
      a.displayname.localeCompare(b.displayname)
    );
  } catch (e: any) {
    console.error('Failed to load partners:', e);
  }
}

async function createNewMap() {
  if (!auth.user?.id || !selectedPartner.value) return;

  // Check if a map already exists with this partner
  const existingMap = maps.value.find(map => 
    (map.partnerA === auth.user!.id && map.partnerB === selectedPartner.value) ||
    (map.partnerB === auth.user!.id && map.partnerA === selectedPartner.value)
  );

  if (existingMap) {
    createMapError.value = 'A milestone map already exists with this partner. Please select a different partner.';
    return;
  }

  creatingMap.value = true;
  createMapError.value = null;

  try {
    const result = await ApiService.callConceptAction(
      'MilestoneMap',
      'createMilestoneMap',
      {
        userB: selectedPartner.value,
      }
    );

    closeCreateMapModal();
    await loadMaps();
  } catch (e: any) {
    createMapError.value = e.message || 'Failed to create milestone map';
  } finally {
    creatingMap.value = false;
  }
}

function closeCreateMapModal() {
  showCreateMapModal.value = false;
  selectedPartner.value = null;
  createMapError.value = null;
}

watch(selectedMapId, async (newMapId) => {
  if (newMapId) {
    await loadMilestones();
  }
});

onMounted(async () => {
  await loadMaps();
  await loadPartners();
  await nextTick();
  if (maps.value.length > 0) {
    initMap();
    await loadMilestones();
  }
});
</script>

<style scoped>
.milestone-map-page {
  max-width: 1400px;
  margin: 0 auto;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3.5rem 4.5rem;
}

.milestone-map-page h1 {
  margin-bottom: 2rem;
}

.loading-container,
.error-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #f7fafd;
  border-radius: 16px;
  color: #666;
  font-size: 1.1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-primary-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.button-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.map-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.map-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.map-selector label {
  font-weight: 600;
  color: var(--color-primary);
}

.map-created-tag {
  padding: 0.5rem 1rem;
  background: #e8f4f8;
  color: var(--color-primary);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.map-select {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--color-primary-border);
  border-radius: 8px;
  font-size: 1rem;
  background: white;
}

.create-button {
  padding: 0.75rem 1.5rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.3s;
  white-space: nowrap;
}

.create-button:hover {
  background: var(--color-accent-dark);
}

.map-wrapper {
  position: relative;
  height: 600px;
  width: 150%;
}

.leaflet-map {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid var(--color-primary-border);
}

.leaflet-map.hidden {
  visibility: hidden;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  border: 2px solid var(--color-primary-border);
  background: #f7fafd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.1rem;
  z-index: 10;
}

.add-milestone-button {
  align-self: flex-start;
  padding: 0.75rem 1.5rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.3s;
}

.add-milestone-button:hover {
  background: var(--color-accent-dark);
}

.milestones-list {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--color-primary-border);
}

.milestones-list h3 {
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.no-milestones {
  text-align: center;
  color: #666;
  padding: 2rem;
  font-style: italic;
}

.milestone-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.milestone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f7fafd;
  border-radius: 8px;
}

.milestone-content h4 {
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.milestone-content p {
  color: #444;
  margin-bottom: 0.5rem;
}

.milestone-meta {
  font-size: 0.875rem;
  color: #888;
}

.remove-button {
  padding: 0.5rem 1rem;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.3s;
}

.remove-button:hover {
  opacity: 0.8;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid var(--color-primary-border);
}

.modal-header h2 {
  margin: 0;
  color: var(--color-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-primary-border);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.location-hint {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.coordinates {
  display: flex;
  gap: 1rem;
}

.coordinates input {
  flex: 1;
}

.error-message {
  color: var(--color-error);
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--color-error-bg);
  border-radius: 6px;
}

.primary-button {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.3s;
}

.primary-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>