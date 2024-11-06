<template>
  <div id="chart-container">
    <ChartView :title="'Power'" />
    <ChartView :title="'Energy'" />
    <!-- <ChartView :title="'Temperature'" :dataType="'CellTemp'"/> -->
    <!-- <ChartView :title="'Chart Four'" /> --> 
  </div>
</template>

<script setup>
import ChartView from './components/ChartView.vue';


</script>

<style>
/* Dark background for the app */
#app {
  background-color: #2a2b2e;
  /* Dark background similar to Vue Black Dashboard */
  color: #ffffff;
  /* White text color for readability */
  font-family: Avenir, Helvetica, Arial, sans-serif;
  min-height: 100vh;

}

/* Chart container styling for 2x2 grid */
#chart-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);  /* Two columns, each taking up equal space */
  gap: 20px;
  width: 100%;
}



</style>