import { defineStore } from 'pinia';
import axios from 'axios';
import { BASE_URL } from '../config';

export const useAuroraStore = defineStore('auroraStore', {
    state: () => ({
        token: sessionStorage.getItem('token') || null, // Initialize from sessionStorage if available
        units: null,
        value: null,
    }),

    getters: {
        // Define any needed getters here
    },

    actions: {

        async getToken() {
            // Check if a token is already stored in state or sessionStorage
            if (this.token) {
                return this.token;
            }

            try {
                // Call the local backend server to get the token
                const response = await axios.get(`${BASE_URL}/api/authenticate`);

                // Assuming the token is in response.data.result
                this.token = response.data.result; 
                
                // Store the token in sessionStorage
                sessionStorage.setItem('token', this.token);
                
                return this.token;
            } catch (error) {
                console.error('Error fetching token from local server:', error);
            }
        },
        async getData(resource, dataType, valueType, startDate, endDate) {
            // Ensure the token is set
            if (!this.token) {
              await this.getToken();
            }
          
            try {
              const response = await axios.get(`${BASE_URL}/api/fetchData`, {
                headers: {
                  Authorization: `Bearer ${this.token}`, // Pass the token here
                },
                params: {
                  resource,
                  dataType,
                  valueType,
                  startDate,
                  endDate,
                },
              });
              console.log('Data received:', response.data.result);
          
              return response.data.result;
            } catch (error) {
              console.error('Error fetching data:', error);
          
              // Check if error is due to a network issue
              if (error.code === 'ERR_NETWORK') {
                return { error: 'Network Error: Unable to reach the server' };
              }
          
              // Handle other types of errors if needed
              return { error: 'Error fetching data' };
            }
          }
          
    }
});
