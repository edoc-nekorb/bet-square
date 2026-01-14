
<script setup>
import { ref } from 'vue';
import { upload } from '../../services/api';
import { Upload, X, Loader2 } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Upload Image'
  },
  bucket: {
    type: String,
    default: 'cms-images'
  },
  resizeWidth: {
      type: Number,
      default: null
  },
  resizeHeight: {
      type: Number,
      default: null
  }
});

const emit = defineEmits(['update:modelValue']);

const fileInput = ref(null);
const isUploading = ref(false);
const errorMsg = ref('');

const triggerUpload = () => {
    fileInput.value.click();
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        errorMsg.value = 'Please select an image file.';
        return;
    }

    isUploading.value = true;
    errorMsg.value = '';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await upload.uploadImage(formData, {
            width: props.resizeWidth,
            height: props.resizeHeight
        });
        emit('update:modelValue', data.publicUrl);
    } catch (error) {
        console.error('Upload Error:', error);
        errorMsg.value = 'Failed to upload image. ' + (error.response?.data?.error || error.message);
    } finally {
        isUploading.value = false;
        // Reset input
        event.target.value = '';
    }
};

const removeImage = () => {
    emit('update:modelValue', '');
};
</script>

<template>
  <div class="image-upload-container">
    <label v-if="label" class="input-label">{{ label }}</label>
    
    <div 
        v-if="!modelValue" 
        class="upload-area" 
        @click="triggerUpload" 
        :class="{ uploading: isUploading }"
    >
        <input 
            type="file" 
            ref="fileInput" 
            class="hidden-input" 
            accept="image/*" 
            @change="handleFileChange"
            :disabled="isUploading"
        />
        
        <div v-if="isUploading" class="upload-placeholder">
            <Loader2 class="animate-spin" :size="24"></Loader2>
            <span>Uploading...</span>
        </div>
        <div v-else class="upload-placeholder">
            <Upload :size="24"></Upload>
            <span>Click to upload image</span>
        </div>
    </div>

    <div v-else class="image-preview">
        <img :src="modelValue" alt="Uploaded Image" />
        <button class="remove-btn" @click="removeImage" type="button">
            <X :size="16"></X>
        </button>
    </div>

    <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>
  </div>
</template>

<style scoped>
.image-upload-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}

.upload-area {
    border: 2px dashed #3f3f46;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background-color: rgba(255, 255, 255, 0.02);
}
.upload-area:hover {
    border-color: var(--color-primary);
    background-color: rgba(34, 197, 94, 0.05);
}
.upload-area.uploading {
    cursor: not-allowed;
    opacity: 0.7;
}

.hidden-input {
    display: none;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
}

.image-preview {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    height: 200px;
    border: 1px solid #3f3f46;
}
.image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}
.remove-btn:hover {
    background-color: #ef4444;
}

.error-text {
    color: #ef4444;
    font-size: 0.8rem;
}

.animate-spin {
    animation: spin 1s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
