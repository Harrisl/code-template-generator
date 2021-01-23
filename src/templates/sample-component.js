module.exports = `
<template>
	<div class="component">
		<!-- {/* Do stuff */} -->
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  name: '<%NAME%>',

  props: {},

  data:() => ({}),

  computed: {},

  methods: {}
});
</script>

<style lang="scss">
//ImportYourCSS
.component {

 }
</style>
`;
