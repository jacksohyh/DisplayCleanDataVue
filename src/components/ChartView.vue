<template>
  <div v-if="loading" class="loader">Loading data...</div>

  <div class="main" v-if="!loading && !error">
    <div class="selector-container">
      <div class="data-type-dropdown">
        <select v-model="dataType">
          <option v-for="option in dataTypeOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
      <div class="data-type-selector" v-if="props.title == 'Power'">
        <label>
          <input type="radio" value="average" v-model="valueType" /> Average
        </label>
        <label>
          <input type="radio" value="maximum" v-model="valueType" /> Maximum
        </label>
        <label>
          <input type="radio" value="minimum" v-model="valueType" /> Minimum
        </label>
      </div>
      <div class="data-type-selector" v-if="props.title == 'Energy'">
        <label>
          <input type="radio" value="delta" v-model="valueType" /> Delta
        </label>
        <label>
          <input type="radio" value="cumulative" v-model="valueType" /> Cumulative
        </label>
      </div>
      <!-- Chart Type Selector (Top Right) -->
      <div class="chart-type-selector">
        <!-- Chart Type Radio Button Group (Bar/Line) -->
        <label>
          <input type="radio" value="bar" v-model="chartType" /> Bar
        </label>
        <label>
          <input type="radio" value="line" v-model="chartType" /> Line
        </label>
      </div>
    </div>

    <div class="chart-container">

      <component :is="chartType === 'bar' ? Bar : Line" id="my-chart-id" :options="chartOptions" :data="chartData" />
    </div>
  </div>

  <div class="error" v-if="error">
    Server Error
  </div>
</template>

<script setup>
import { ref, watch, onMounted, watchEffect } from 'vue';
import { Bar, Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js';
import { useAuroraStore } from '@/stores/auroraStore.js';

const auroraStore = useAuroraStore();
const loading = ref(true); // Loading state
const dataType = ref(null); // Initialize as null
const error = ref(false)

// Watch props.title to set dataTypeOptions and default value
const dataTypeOptions = ref([]);



// Register Chart.js components, including PointElement
ChartJS.register(Title, Tooltip, Legend, BarElement, LineElement, PointElement, CategoryScale, LinearScale);

// Track selected chart type and data type
const chartType = ref('bar');
const valueType = ref('');

// Define props
const props = defineProps({
  title: {
    type: String,
    required: true,
  },

});

if (props.title === "Power") {
  valueType.value = 'average';
} else if (props.title === "Energy") {
  valueType.value = 'delta';
}

watchEffect(() => {
  if (props.title === 'Power') {
    dataTypeOptions.value = [
      'GenerationPower',
      'DCGenerationPower',
      'Irradiance',
      'GridPowerExport',
      'StoredPower',
      'ActivePowerEV'
    ];
    dataType.value = dataTypeOptions.value[0]; // Set default to first option
  } else if (props.title === 'Energy') {
    dataTypeOptions.value = [
      'GenerationEnergy',
      'DCGenerationEnergy',
      'Insolation',
      'StorageInEnergy',
      'StorageOutEnergy',
      'GridEnergyExport',
      'GridEnergyImport',
      'SelfConsumedEnergy',
      'ActiveEnergyEV',
      'SessionEnergyEV'
    ];
    dataType.value = dataTypeOptions.value[0]; // Set default to first option
  } else {
    dataTypeOptions.value = [];
    dataType.value = null;
  }
});

// Watch for changes in dataType and trigger data fetch
watch(dataType, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    loading.value = true; // Disable dropdown and show loading indicator
    await reloadChartData(); // Fetch new data
    loading.value = false; // Enable dropdown after data is fetched
  }
});

// Watch valueType and trigger data refetch on change
watch(valueType, async (newVal, oldVal) => {
  if (newVal !== oldVal) { // Check if the value has changed
    console.log(`Selected data type: ${newVal}`);
    await reloadChartData();
  }
});


watch(chartType, (newVal) => {
  console.log(`Selected chart type: ${newVal}`);
});

let chartData = ref();
let chartOptions = ref();

onMounted(async () => {
  await reloadChartData();
});

async function reloadChartData() {
  loading.value = true;
  error.value = false; // Reset error state before attempting data fetch

  try {
    const { chartDataX, chartOptionsY } = await getPowerDataForYear(2024);
    chartData.value = chartDataX;
    chartOptions.value = chartOptionsY;
  } catch (err) {
    error.value = true; // Set error state if fetching data fails
    console.error("Error fetching data:", err);
  } finally {
    loading.value = false;
  }
}


async function getPowerDataForYear(year) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = {};
  let units = null;
  let hasDifferentUnits = false;

  const dataPromises = months.map((monthName, monthIndex) => {
    const { startDate, endDate } = getMonthStartAndEndDates(year, monthIndex + 1);
    return auroraStore.getData(props.title.toLowerCase(), dataType.value, valueType.value, startDate, endDate)
      .then(result => {
        if (result && 'value' in result) {
          // Case 1: result contains 'value'
          monthlyData[monthName] = result.value;
          if (units === null) {
            units = result.units;
          } else if (units !== result.units) {
            hasDifferentUnits = true;
          }
        } else if (result && result.error) {
          // Case 3: result contains an error
          console.warn(result.error);
          monthlyData[monthName] = "error"; // Assign the error message
        } else {
          // Case 2: result is defined but does not contain 'value' or 'error'
          monthlyData[monthName] = null;
        }
      });
  });


  try {
    await Promise.all(dataPromises);
    const finalUnits = hasDifferentUnits ? `Multiple units: ${units}` : units;
    const dataColors = months.map(month => monthlyData[month] === null ? 'rgba(255, 99, 132, 0.6)' : 'rgba(75, 192, 192, 0.2)');
    const borderColors = months.map(month => monthlyData[month] === null ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)');

    const chartDataX = {
      labels: months,
      datasets: [
        {
          label: finalUnits || "Units",
          data: months.map(month => monthlyData[month]),
          backgroundColor: dataColors,
          borderColor: borderColors,
          borderWidth: 1,
        }
      ],
    };

    const chartOptionsY = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: props.title + "(" + valueType.value.charAt(0).toUpperCase() + valueType.value.slice(1) + ")",
          font: { size: 20 },
        },
        subtitle: {
          display: true,
          text: `Year: ${year}`,
          font: { size: 16 },
          padding: { bottom: 10 },
        }
      },
      scales: {
        x: {
          ticks: {
            color: function (context) {
              const month = months[context.index];
              const value = monthlyData[month];

              if (value === "error") {
                return 'red'; // Red for error
              } else if (value === null) {
                return 'yellow'; // Yellow for no data
              } else {
                return 'green'; // Green for valid data
              }
            },
          },
          title: {
            display: true,
            text: `Year: ${year}`,
            font: { size: 14 },
            padding: { top: 10 },
          }
        },
        y: {
          beginAtZero: true,
        }
      }
    };

    return { chartDataX, chartOptionsY };
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function getMonthStartAndEndDates(year, month) {
  const firstDay = `${year}${String(month).padStart(2, '0')}01`;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const lastDay = `${year}${String(month).padStart(2, '0')}${String(lastDayOfMonth).padStart(2, '0')}`;

  return {
    startDate: firstDay,
    endDate: lastDay
  };
}
</script>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.selector-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  /* Three equal columns */
  align-items: center;
  padding: 10px;
  background-color: rgba(42, 43, 46, 0.8);
  /* Dark background */
  border-radius: 5px;
}

.data-type-dropdown {
  justify-self: start;
  /* Aligns to the top left */
  background-color: rgba(0, 0, 0, 0.8);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
}

.data-type-selector {
  justify-self: center;
  /* Center position */
  display: flex;
  gap: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
}

.data-type-dropdown option[disabled] {
  color: #bbbbbb;
  /* Greyed out for the placeholder */
}

.chart-type-selector {
  justify-self: end;
  /* Aligns to the top right */
  display: flex;
  gap: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
}

.chart-container {
  flex: 1;
  /* Remaining 80% height */
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>