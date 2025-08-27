import random
from itertools import combinations


def solve_quadruple_selection_random(S4, n, r, j, max_attempts=1000):
    """
    使用随机采样解决四元组选择问题
    
    S4: 四元组列表
    n: S1中元素个数
    r: 每个元素的目标出现次数
    j: 目标四元组个数
    max_attempts: 最大尝试次数
    
    返回: 找到的解，如果没有找到返回None
    """
    m = len(S4)
    
    # 预计算每个四元组对每个元素的贡献
    quad_contributions = []
    for quad in S4:
        contribution = [0] * n
        for elem in quad:
            contribution[elem-1] = 1
        quad_contributions.append(contribution)
    
    def evaluate_solution(selected_quads):
        """评估解的质量"""
        state = [0] * n
        for quad_idx in selected_quads:
            contribution = quad_contributions[quad_idx]
            for i in range(n):
                state[i] += contribution[i]
        
        # 计算与目标的差距
        total_gap = 0
        for i in range(n):
            gap = abs(r - state[i])
            total_gap += gap
        
        return total_gap, state
    
    def random_search():
        """随机搜索解"""
        for attempt in range(max_attempts):
            # 随机选择j个四元组
            selected_quads = random.sample(range(m), j)
            
            # 评估解的质量
            gap, state = evaluate_solution(selected_quads)
            
            # 如果找到完美解，返回
            if gap == 0:
                return selected_quads
            
            # 如果差距很小，尝试局部优化
            if gap <= 4:  # 允许1个元素的误差
                # 尝试替换一个四元组来改善解
                for i in range(j):
                    for new_quad in range(m):
                        if new_quad not in selected_quads:
                            # 临时替换
                            temp_quads = selected_quads.copy()
                            temp_quads[i] = new_quad
                            new_gap, _ = evaluate_solution(temp_quads)
                            
                            if new_gap < gap:
                                selected_quads = temp_quads
                                gap = new_gap
                                
                                if gap == 0:
                                    return selected_quads
                                break
        
        return None
    
    # 设置随机种子以获得可重复的结果
    random.seed(42)
    return random_search()


def solve_quadruple_selection_heuristic(S4, n, r, j):
    """
    使用启发式搜索解决四元组选择问题，更快找到解
    
    S4: 四元组列表
    n: S1中元素个数
    r: 每个元素的目标出现次数
    j: 目标四元组个数
    
    返回: 找到的解，如果没有找到返回None
    """
    m = len(S4)
    
    # 预计算每个四元组对每个元素的贡献
    quad_contributions = []
    for quad in S4:
        contribution = [0] * n
        for elem in quad:
            contribution[elem-1] = 1
        quad_contributions.append(contribution)
    
    # 贪心策略：优先选择能让元素分布更均匀的四元组
    def evaluate_quad(quad_idx, current_state):
        """评估选择某个四元组的价值"""
        contribution = quad_contributions[quad_idx]
        new_state = list(current_state)
        
        # 计算选择后的状态
        for i in range(n):
            new_state[i] += contribution[i]
        
        # 计算与目标的差距
        total_gap = 0
        for i in range(n):
            if new_state[i] > r:
                return -float('inf')  # 超过目标，不可选
            gap = r - new_state[i]
            total_gap += gap
        
        # 优先选择能让总差距最小的四元组
        return -total_gap
    
    def search_solution(current_state, selected_quads, remaining_quads):
        """递归搜索解"""
        if len(selected_quads) == j:
            # 检查是否满足条件
            if all(count == r for count in current_state):
                return selected_quads
            return None
        
        if len(selected_quads) + len(remaining_quads) < j:
            return None
        
        # 贪心选择下一个四元组
        candidates = []
        for quad_idx in remaining_quads:
            score = evaluate_quad(quad_idx, current_state)
            if score > -float('inf'):
                candidates.append((score, quad_idx))
        
        # 按评分排序，优先选择评分高的
        candidates.sort(reverse=True)
        
        for score, quad_idx in candidates:
            # 选择这个四元组
            contribution = quad_contributions[quad_idx]
            new_state = list(current_state)
            for i in range(n):
                new_state[i] += contribution[i]
            
            new_remaining = [q for q in remaining_quads if q != quad_idx]
            result = search_solution(new_state, selected_quads + [quad_idx], new_remaining)
            if result:
                return result
        
        return None
    
    # 开始搜索
    initial_state = [0] * n
    all_quads = list(range(m))
    
    return search_solution(initial_state, [], all_quads)


def solve_quadruple_selection(S4, n, r):
    """
    使用动态规划解决四元组选择问题，添加剪枝优化
    
    S4: 四元组列表
    n: S1中元素个数
    r: 每个元素的目标出现次数，用于剪枝
    
    返回: DP表，其中DP[i][state] = (min_j, prev_state, selected_quad)
    """
    m = len(S4)
    
    # 初始化DP表
    # DP[i][state] = (min_j, prev_state, selected_quad)
    # 其中state是长度为n的元组，表示每个元素的出现次数
    DP = {}
    
    # 初始状态：DP[0][(0,0,...,0)] = (0, None, None)
    initial_state = tuple([0] * n)
    DP[0] = {initial_state: (0, None, None)}
    
    # 动态规划主循环
    for i in range(1, m + 1):
        DP[i] = {}
        
        # 处理前i-1个四元组的所有状态
        if i-1 in DP:
            for prev_state, (prev_j, prev_prev_state, prev_selected) in DP[i-1].items():
                prev_state_list = list(prev_state)
                
                # 不选择第i个四元组
                if prev_state not in DP[i] or DP[i][prev_state][0] > prev_j:
                    DP[i][prev_state] = (prev_j, prev_state, None)
                
                # 选择第i个四元组
                new_state_list = prev_state_list.copy()
                for elem in S4[i-1]:  # S4[i-1]是第i个四元组
                    new_state_list[elem-1] += 1
                
                # 剪枝：如果任何元素出现次数超过r，跳过该状态
                if any(count > r for count in new_state_list):
                    continue
                
                new_state = tuple(new_state_list)
                new_j = prev_j + 1
                
                if new_state not in DP[i] or DP[i][new_state][0] > new_j:
                    DP[i][new_state] = (new_j, prev_state, i-1)
    
    return DP


def find_solutions(dp, n, S4, j, r):
    """
    找到满足条件的解
    
    dp: 动态规划结果表
    n: 元素个数
    S4: 四元组列表
    j: 目标四元组个数
    r: 每个元素的目标出现次数
    
    返回: 满足条件的解列表
    """
    solutions = []
    
    # 遍历所有状态，找到满足条件的解
    for i in dp:
        if i == 0:
            continue
            
        for state, (current_j, prev_state, selected_quad) in dp[i].items():
            # 检查是否满足条件：四元组个数为j，每个数字出现次数为r
            if current_j == j and all(count == r for count in state):
                # 回溯找到选中的四元组
                selected_quads = []
                current_state = state
                current_i = i
                
                while current_state != tuple([0] * n):
                    if current_i in dp and current_state in dp[current_i]:
                        _, prev_state, selected = dp[current_i][current_state]
                        if selected is not None:
                            selected_quads.append(selected)
                        current_state = prev_state
                        current_i -= 1
                    else:
                        break
                
                selected_quads.reverse()
                solutions.append(selected_quads)
    
    return solutions


def generate_all_quadruples(n):
    """生成n个元素的所有4元素组合"""
    S1 = list(range(1, n + 1))
    S4 = list(combinations(S1, 4))
    return S4


def select_algorithm(S4, n, r, j):
    """
    根据问题规模自适应选择算法
    
    S4: 四元组列表
    n: 元素个数
    r: 每个元素的目标出现次数
    j: 目标四元组个数
    
    返回: 算法名称和对应的函数
    """
    m = len(S4)
    
    # 计算状态空间大小估计
    # 每个元素最多出现r次，所以状态空间约为 (r+1)^n
    state_space_size = (r + 1) ** n
    
    # 计算四元组数量
    quad_count = m
    
    # 算法选择策略
    if quad_count <= 50 and state_space_size <= 1000000:  # 小规模问题
        return "动态规划+剪枝", "dp"
    elif quad_count <= 100 and state_space_size <= 10000000:  # 中等规模问题
        return "启发式搜索", "heuristic"
    else:  # 大规模问题，状态空间爆炸
        return "随机采样", "random"


def solve_quadruple_selection_adaptive(S4, n, r, j):
    """
    自适应算法选择器，根据问题规模选择最合适的算法
    
    S4: 四元组列表
    n: S1中元素个数
    r: 每个元素的目标出现次数
    j: 目标四元组个数
    
    返回: 找到的解，如果没有找到返回None
    """
    algorithm_name, algorithm_type = select_algorithm(S4, n, r, j)
    
    print(f"问题规模分析:")
    print(f"  四元组数量: {len(S4)}")
    print(f"  元素个数: {n}")
    print(f"  目标出现次数: {r}")
    print(f"  目标四元组个数: {j}")
    print(f"  估计状态空间大小: {(r + 1) ** n:,}")
    print(f"  推荐算法: {algorithm_name}")
    print()
    
    if algorithm_type == "dp":
        print("使用动态规划+剪枝算法...")
        result = solve_quadruple_selection(S4, n, r)
        solutions = find_solutions(result, n, S4, j, r)
        if solutions:
            return solutions[0]  # 返回第一个解
        return None
        
    elif algorithm_type == "heuristic":
        print("使用启发式搜索算法...")
        return solve_quadruple_selection_heuristic(S4, n, r, j)
        
    else:  # random
        print("使用随机采样算法...")
        return solve_quadruple_selection_random(S4, n, r, j)


# 示例验证
def test_example():
    n = 8  # 测试大规模问题
    S4 = generate_all_quadruples(n)
    
    print(f"n = {n}")
    print(f"四元组数量: {len(S4)}")
    
    # 设置目标参数 - 测试大规模问题
    j = 20  # 目标四元组个数
    r = 10  # 每个数字的目标出现次数
    
    # 使用自适应算法选择器
    solution = solve_quadruple_selection_adaptive(S4, n, r, j)
    
    if solution:
        print("算法成功找到解！")
        solutions = [solution]
    else:
        print("所有算法都未找到解")
        solutions = []
    
    print(f"目标：j = {j}, r = {r}")
    print(f"即：选择{j}个四元组，每个数字出现{r}次")
    print()
    
    print("找到的解:")
    if solutions:
        # 去重：将解转换为集合来去除重复
        unique_solutions = []
        seen = set()
        for selection in solutions:
            selection_tuple = tuple(sorted(selection))
            if selection_tuple not in seen:
                seen.add(selection_tuple)
                unique_solutions.append(selection)
        
        print(f"总共找到 {len(solutions)} 个解，去重后有 {len(unique_solutions)} 个唯一解")
        print()
        
        for i, selection in enumerate(unique_solutions):
            selected_quads = [S4[idx] for idx in selection]
            print(f"  解{i+1}: 选择四元组 {selection}")
            print(f"        具体四元组: {selected_quads}")
            
            # 验证解的正确性
            state = [0] * n
            for quad in selected_quads:
                for elem in quad:
                    state[elem-1] += 1
            print(f"        验证状态: {state}")
            print()
    else:
        print("没有找到满足条件的解")


if __name__ == "__main__":
    test_example()