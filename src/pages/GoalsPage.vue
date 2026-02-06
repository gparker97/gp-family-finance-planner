<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal } from '@/components/ui';
import CurrencyAmount from '@/components/common/CurrencyAmount.vue';
import { CURRENCIES } from '@/constants/currencies';
import type { Goal, CreateGoalInput, UpdateGoalInput, GoalType, GoalPriority } from '@/types/models';

const goalsStore = useGoalsStore();
const familyStore = useFamilyStore();
const settingsStore = useSettingsStore();

const showAddModal = ref(false);
const showEditModal = ref(false);
const editingGoal = ref<Goal | null>(null);
const isSubmitting = ref(false);

const goalTypes: { value: GoalType; label: string }[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'investment', label: 'Investment' },
  { value: 'purchase', label: 'Purchase' },
];

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const currencyOptions = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} - ${c.name}`,
}));

const memberOptions = computed(() => [
  { value: '', label: 'Family-wide goal' },
  ...familyStore.members.map((m) => ({ value: m.id, label: m.name })),
]);

// Form data for adding - use string type for memberId to work with BaseSelect
interface NewGoalForm {
  memberId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string;
  priority: GoalPriority;
  isCompleted: boolean;
}

const newGoal = ref<NewGoalForm>({
  memberId: familyStore.currentMemberId || '',
  name: '',
  type: 'savings',
  targetAmount: 0,
  currentAmount: 0,
  currency: settingsStore.baseCurrency,
  deadline: '',
  priority: 'medium',
  isCompleted: false,
});

// Form data for editing - all required fields with defaults
interface EditGoalForm {
  id: string;
  memberId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string;
  priority: GoalPriority;
  isCompleted: boolean;
  notes?: string;
}

const editGoal = ref<EditGoalForm>({
  id: '',
  memberId: '',
  name: '',
  type: 'savings',
  targetAmount: 0,
  currentAmount: 0,
  currency: settingsStore.baseCurrency,
  deadline: '',
  priority: 'medium',
  isCompleted: false,
});

function getMemberName(memberId?: string): string {
  if (!memberId) return 'Family';
  const member = familyStore.members.find((m) => m.id === memberId);
  return member?.name || 'Unknown';
}

function getMemberColor(memberId?: string): string {
  if (!memberId) return '#3b82f6'; // Blue for family-wide
  const member = familyStore.members.find((m) => m.id === memberId);
  return member?.color || '#6b7280';
}

function openAddModal() {
  newGoal.value = {
    memberId: familyStore.currentMemberId || '',
    name: '',
    type: 'savings',
    targetAmount: 0,
    currentAmount: 0,
    currency: settingsStore.baseCurrency,
    deadline: '',
    priority: 'medium',
    isCompleted: false,
  };
  showAddModal.value = true;
}

async function createGoal() {
  if (!newGoal.value.name.trim()) return;

  isSubmitting.value = true;
  try {
    // Convert form data to API input
    const input: CreateGoalInput = {
      ...newGoal.value,
      memberId: newGoal.value.memberId === '' ? undefined : newGoal.value.memberId,
      deadline: newGoal.value.deadline === '' ? undefined : newGoal.value.deadline,
    };
    await goalsStore.createGoal(input);
    showAddModal.value = false;
  } finally {
    isSubmitting.value = false;
  }
}

function openEditModal(goal: Goal) {
  editingGoal.value = goal;
  editGoal.value = {
    id: goal.id,
    memberId: goal.memberId || '',
    name: goal.name,
    type: goal.type,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    currency: goal.currency,
    deadline: goal.deadline?.split('T')[0] || '',
    priority: goal.priority,
    isCompleted: goal.isCompleted,
    notes: goal.notes,
  };
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  editingGoal.value = null;
}

async function updateGoal() {
  if (!editGoal.value.name?.trim()) return;

  isSubmitting.value = true;
  try {
    const { id, ...formData } = editGoal.value;
    // Convert empty string memberId to undefined for the API
    const input: UpdateGoalInput = {
      ...formData,
      memberId: formData.memberId === '' ? undefined : formData.memberId,
      deadline: formData.deadline === '' ? undefined : formData.deadline,
    };
    await goalsStore.updateGoal(id, input);
    closeEditModal();
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteGoal(id: string) {
  if (confirm('Are you sure you want to delete this goal?')) {
    await goalsStore.deleteGoal(id);
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals</h1>
        <p class="text-gray-500 dark:text-gray-400">Set and track your financial goals</p>
      </div>
      <BaseButton @click="openAddModal">
        Add Goal
      </BaseButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <BaseCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Active Goals</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
          {{ goalsStore.activeGoals.length }}
        </p>
      </BaseCard>
      <BaseCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Completed Goals</p>
        <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
          {{ goalsStore.completedGoals.length }}
        </p>
      </BaseCard>
      <BaseCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Overdue Goals</p>
        <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
          {{ goalsStore.overdueGoals.length }}
        </p>
      </BaseCard>
    </div>

    <BaseCard title="All Goals">
      <div v-if="goalsStore.goals.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No goals set yet.</p>
        <p class="mt-2">Click "Add Goal" to create your first financial goal.</p>
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="goal in goalsStore.goalsByPriority"
          :key="goal.id"
          class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">{{ goal.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ goalTypes.find(t => t.value === goal.type)?.label }} -
                {{ priorityOptions.find(p => p.value === goal.priority)?.label }} priority
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <span
                  class="w-2.5 h-2.5 rounded-full inline-block"
                  :style="{ backgroundColor: getMemberColor(goal.memberId) }"
                />
                {{ getMemberName(goal.memberId) }}
              </p>
            </div>
            <div class="flex gap-1">
              <button
                class="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                title="Edit"
                @click="openEditModal(goal)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                title="Delete"
                @click="deleteGoal(goal.id)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-gray-500 dark:text-gray-400">Progress</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">
              <CurrencyAmount :amount="goal.currentAmount" :currency="goal.currency" size="sm" />
              <span class="mx-1">/</span>
              <CurrencyAmount :amount="goal.targetAmount" :currency="goal.currency" size="sm" />
            </span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="goal.isCompleted ? 'bg-green-600' : 'bg-blue-600'"
              :style="{ width: `${goalsStore.getGoalProgress(goal)}%` }"
            />
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Add Goal Modal -->
    <BaseModal
      :open="showAddModal"
      title="Add Goal"
      @close="showAddModal = false"
    >
      <form class="space-y-4" @submit.prevent="createGoal">
        <BaseInput
          v-model="newGoal.name"
          label="Goal Name"
          placeholder="e.g., Emergency Fund"
          required
        />

        <BaseSelect
          v-model="newGoal.type"
          :options="goalTypes"
          label="Goal Type"
        />

        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            v-model="newGoal.targetAmount"
            type="number"
            label="Target Amount"
            placeholder="0.00"
          />

          <BaseSelect
            v-model="newGoal.currency"
            :options="currencyOptions"
            label="Currency"
          />
        </div>

        <BaseInput
          v-model="newGoal.currentAmount"
          type="number"
          label="Current Amount"
          placeholder="0.00"
        />

        <BaseSelect
          v-model="newGoal.priority"
          :options="priorityOptions"
          label="Priority"
        />

        <BaseSelect
          v-model="newGoal.memberId"
          :options="memberOptions"
          label="Assign to"
        />

        <BaseInput
          v-model="newGoal.deadline"
          type="date"
          label="Deadline (Optional)"
        />
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="showAddModal = false">
            Cancel
          </BaseButton>
          <BaseButton :loading="isSubmitting" @click="createGoal">
            Add Goal
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Edit Goal Modal -->
    <BaseModal
      :open="showEditModal"
      title="Edit Goal"
      @close="closeEditModal"
    >
      <form class="space-y-4" @submit.prevent="updateGoal">
        <BaseInput
          v-model="editGoal.name"
          label="Goal Name"
          placeholder="e.g., Emergency Fund"
          required
        />

        <BaseSelect
          v-model="editGoal.type"
          :options="goalTypes"
          label="Goal Type"
        />

        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            v-model="editGoal.targetAmount"
            type="number"
            label="Target Amount"
            placeholder="0.00"
          />

          <BaseSelect
            v-model="editGoal.currency"
            :options="currencyOptions"
            label="Currency"
          />
        </div>

        <BaseInput
          v-model="editGoal.currentAmount"
          type="number"
          label="Current Amount"
          placeholder="0.00"
        />

        <BaseSelect
          v-model="editGoal.priority"
          :options="priorityOptions"
          label="Priority"
        />

        <BaseSelect
          v-model="editGoal.memberId"
          :options="memberOptions"
          label="Assign to"
        />

        <BaseInput
          v-model="editGoal.deadline"
          type="date"
          label="Deadline (Optional)"
        />

        <div class="flex items-center gap-2">
          <input
            id="isCompleted"
            v-model="editGoal.isCompleted"
            type="checkbox"
            class="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <label for="isCompleted" class="text-sm text-gray-700 dark:text-gray-300">
            Mark as completed
          </label>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="closeEditModal">
            Cancel
          </BaseButton>
          <BaseButton :loading="isSubmitting" @click="updateGoal">
            Save Changes
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
